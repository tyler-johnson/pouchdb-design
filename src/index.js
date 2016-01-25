import isPlainObject from "is-plain-object";

function validateName(name, type) {
	if (typeof name !== "string" || name === "") {
		throw new Error(`Expecting non-empty string for ${type} name.`);
	}
}

function normalizeValue(value) {
	if (value != null) {
		if (typeof value === "object" && !isPlainObject(value)) {
			value = value.toJSON();
		} else if (!~["string","number","boolean"].indexOf(typeof value)) {
			value = value.toString();
		}
	}

	return value;
}

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

class Design {
	constructor(db, id) {
		this.db = db;
		this.id = id;
		this.doc = {};
	}

	get _id() {
		let id = this.id;
		if (!id) return;
		if (!/^_design\//.test(id)) id = "_design/" + id;
		return id;
	}

	set(path, value) {
		let parts;
		if (typeof path === "string") {
			parts = path.split("/").filter(Boolean);
		} else if (Array.isArray(path)) {
			parts = path;
		} else {
			throw new Error("Invalid path.");
		}

		if (parts.length < 1) throw new Error("Missing path.");

		let last = parts.pop();
		let obj = parts.reduce((o, p) => {
			if (!has(o,p) || !isPlainObject(o[p])) o[p] = {};
			return o[p];
		}, this.doc);

		obj[last] = normalizeValue(value);
		return this;
	}

	view(name, map, reduce) {
		validateName(name, "view");

		if (typeof map === "object" && map != null && reduce == null) {
			[reduce,map]=[map.reduce,map.map];
		}

		if (typeof map !== "undefined") {
			this.set([ "views", name, "map" ], map);
		}

		if (typeof reduce !== "undefined") {
			this.set([ "views", name, "reduce" ], reduce);
		}

		return this;
	}

	show(name, fn) {
		validateName(name, "show");
		return this.set([ "shows", name ], fn);
	}

	list(name, fn) {
		validateName(name, "list");
		return this.set([ "lists", name ], fn);
	}

	update(name, fn) {
		validateName(name, "update");
		return this.set([ "updates", name ], fn);
	}

	filter(name, fn) {
		validateName(name, "filter");
		return this.set([ "filters", name ], fn);
	}

	validate(fn) {
		return this.set("validate_doc_update", fn);
	}

	merge(doc) {
		for (let k in this.doc) {
			if (!has(this.doc, k)) continue;
			if (typeof this.doc[k] === "object") {
				if (!has(doc, k)) doc[k] = {};

				for (let name in this.doc[k]) {
					if (!has(this.doc[k], name)) continue;
					if (this.doc[k][name] == null) delete doc[k][name];
					else doc[k][name] = this.doc[k][name];
				}
			} else {
				doc[k] = this.doc[k];
			}
		}

		return doc;
	}

	then(resolve, reject) {
		return Promise.resolve().then(() => {
			let id = this._id;
			if (!id) return Promise.reject(new Error("Design doc is missing an id."));

			let upsert = () => {
				return this.db.get(id).catch((e) => {
					if (e.status !== 404) throw e;
				}).then((ex) => {
					if (!ex) return this.db.post(this.toJSON());
					return this.db.put(this.merge(ex)).catch((e) => {
						if (e.status === 409) return upsert();
						throw e;
					});
				});
			};

			return upsert();
		}).then(resolve, reject);
	}

	catch(reject) {
		return this.then(null, reject);
	}

	toJSON() {
		return this.merge({
			_id: this._id,
			language: "javascript"
		});
	}
}

let plugin = {
	design: function(id) {
		return new Design(this, id);
	}
};

[ "view", "show", "list", "update", "filter", "validate" ].forEach(function(n) {
	plugin[n] = function(id, ...args) {
		let d = this.design(id);
		return d[n].apply(d, args);
	};
});

export default plugin;
