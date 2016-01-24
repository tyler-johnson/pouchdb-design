function validateName(name) {
	if (typeof name !== "string" || name === "") {
		throw new Error("Expecting non-empty string for validation name.");
	}
}

function normalizeFunction(fn) {
	if (typeof fn === "function") fn = fn.toString();
	return typeof fn !== "string" || !fn ? null : fn;
}

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const method_names = [ "view", "show", "list", "update", "filter", "validate" ];

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

	_setMethod(key, name, value) {
		name = validateName(name);
		if (!this.doc[key]) this.doc[key] = {};
		this.doc[key][name] = value;
	}

	view(name, map, reduce) {
		name = validateName(name);

		if (typeof map === "object" && map != null && reduce == null) {
			[reduce,map]=[map.reduce,map.map];
		}

		map = normalizeFunction(map);
		reduce = normalizeFunction(reduce);
		this._setMethod("views", name, map == null && reduce == null ? null : { map, reduce });

		return this;
	}

	show(name, fn) {
		fn = normalizeFunction(fn);
		this._setMethod("shows", name, fn);
		return this;
	}

	list(name, fn) {
		fn = normalizeFunction(fn);
		this._setMethod("lists", name, fn);
		return this;
	}

	update(name, fn) {
		fn = normalizeFunction(fn);
		this._setMethod("updates", name, fn);
		return this;
	}

	filter(name, fn) {
		fn = normalizeFunction(fn);
		this._setMethod("filters", name, fn);
		return this;
	}

	validate(fn) {
		fn = normalizeFunction(fn);
		this.doc.validate_doc_update = fn;
		return this;
	}

	merge(doc) {
		for (let k in this.doc) {
			if (!has(this.doc, k)) continue;
			if (typeof this.doc[k] === "object") {
				if (!has(doc, k)) doc[k] = {};

				for (let name in this.doc[k]) {
					if (!has(this.doc[k], name)) continue;
					if (!this.doc[k][name]) delete doc[k][name];
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

method_names.forEach(function(n) {
	plugin[n] = function(id, ...args) {
		let d = this.design(id);
		return d[n].apply(d, args);
	};
});

export default function pouchDesign() {
	return plugin;
}

pouchDesign.Design = Design;
