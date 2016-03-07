import isPlainObject from "is-plain-object";
import {isEqual,assign,set,get,unset} from "lodash";

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

class Design {
	constructor(db, doc) {
		this.db = db;
		if (typeof doc === "string") doc = { _id: doc };
		this.doc = assign({}, doc);
		this.id = this.doc._id;
	}

	clone(db) {
		return new Design(db || this.db, this.doc);
	}

	get id() {
		return this.doc._id;
	}

	set id(id) {
		if (typeof id === "string" && id !== "") {
			if (!/^_design\//.test(id)) id = "_design/" + id;
		} else {
			id = null;
		}

		return (this.doc._id = id);
	}

	get(path) {
		return get(this.doc, path);
	}

	set(path, value) {
		set(this.doc, path, normalizeValue(value));
		return this;
	}

	unset(path) {
		unset(this.doc, path);
		return this;
	}

	lib(name, fn) {
		let src = "module.exports=";

		if (typeof fn === "function") {
			if (fn.name) src += fn.name + ";\n";
			src += fn.toString();
		} else {
			src += normalizeValue(fn);
		}

		return this.set(name, src);
	}

	view(name, map, reduce) {
		validateName(name, "view");

		if (typeof map === "object" && map != null && reduce == null) {
			[reduce,map]=[map.reduce,map.map];
		}

		this.set([ "views", name, "map" ], map);
		this.set([ "views", name, "reduce" ], reduce);
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

	fetch() {
		return this._fetch().then(doc => {
			this.doc = doc;
			return this;
		});
	}

	_fetch() {
		if (!this.id) throw new Error("Design doc is missing an id.");
		return this.db.get(this.id).catch(e => {
			if (e.status !== 404) throw e;
		});
	}

	save() {
		let upsert = () => {
			let doc = this.toJSON();
			return this._fetch().then(d => {
				if (d) doc._rev = d._rev;
				if (isEqual(doc, d)) return;
				return this.db.put(doc).catch((e) => {
					if (e.status === 409) return upsert();
					throw e;
				});
			});
		};

		return Promise.resolve().then(upsert);
	}

	then(resolve, reject) {
		return this.save().then(resolve, reject);
	}

	catch(reject) {
		return this.then(null, reject);
	}

	toJSON() {
		return assign({ language: "javascript" }, this.doc);
	}
}

// [ "view", "show", "list", "update", "filter", "validate" ].forEach(function(n) {
// 	plugin[n] = function(id, ...args) {
// 		let d = this.design(id);
// 		return d["add" + n[0].toUpperCase() + n.substr(1)].apply(d, args);
// 	};
// });

export default function plugin(PouchDB) {
	PouchDB.Design = Design;
	PouchDB.design = function(doc) {
		return new Design(null, doc);
	};
	PouchDB.plugin(plugin);
}

plugin.design = function(doc) {
	return new Design(this, doc);
};
