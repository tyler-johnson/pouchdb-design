import test from "tape";
import plugin from "../src/index.js";

test("constructor accepts full design document", (t) => {
  t.plan(2);

  const design = new plugin.Design(null, {
    _id: "_design/mydesign",
    views: { xyz: {} }
  });

  t.equals(design.id, "_design/mydesign", "has correct id");
  t.deepEquals(design.get("views.xyz"), {}, "has deep value");
});

test("constructor accepts a full id", (t) => {
  t.plan(1);
  const design = new plugin.Design(null, "_design/mydesign");
  t.equals(design.id, "_design/mydesign", "has correct id");
});

test("constructor accepts partial id", (t) => {
  t.plan(1);
  const design = new plugin.Design(null, "mydesign");
  t.equals(design.id, "_design/mydesign", "has correct id");
});

test("sets full id", (t) => {
  t.plan(1);
  const design = new plugin.Design(null, {});
  design.id = "_design/mydesign";
  t.equals(design.id, "_design/mydesign", "has correct id");
});

test("sets partial id", (t) => {
  t.plan(1);
  const design = new plugin.Design(null, {});
  design.id = "mydesign";
  t.equals(design.id, "_design/mydesign", "has correct id");
});

test("fetches existing document", (t) => {
  t.plan(2);

  const design = new plugin.Design({
    get: function(id) {
      t.equals(id, "_design/mydesign", "fetched correct id");
      return Promise.resolve({
        _id: "_design/mydesign",
        views: { myview: {} }
      });
    }
  }, "mydesign");

  design.fetch().then(() => {
    t.deepEquals(design.get("views.myview"), {}, "has deep value");
    t.end();
  }).catch(t.error);
});

test("fetches nonexistant document", (t) => {
  t.plan(2);

  const design = new plugin.Design({
    get: function(id) {
      t.equals(id, "_design/mydesign", "fetched correct id");
      return Promise.reject({ error: true, status: 404 });
    }
  }, "mydesign");

  design.fetch().then(() => {
    t.pass("fetched successfully");
    t.end();
  }).catch(t.error);
});

test("saves document", (t) => {
  t.plan(4);

  const design = new plugin.Design({
    get: function(id) {
      t.equals(id, "_design/mydesign", "fetched correct id");
      return Promise.reject({ error: true, status: 404 });
    },
    put: function(doc) {
      t.equals(doc.language, "javascript", "correct language");
      t.equals(doc._id, "_design/mydesign", "correct id");
      return Promise.resolve();
    }
  }, "mydesign");

  design.save().then(() => {
    t.pass("saved successfully");
    t.end();
  }).catch(t.error);
});

test("sets value", (t) => {
  t.plan(1);
  const design = new plugin.Design(null, "mydesign");
  const fn = function(){};
  design.set("foo", fn);
  t.equals(design.get("foo"), fn.toString(), "set a function");
});

test("unsets value", (t) => {
  t.plan(1);
  const design = new plugin.Design(null, "mydesign");
  design.set("foo", "hello");
  design.unset("foo");
  t.equals(design.get("foo"), void 0, "unset value");
});

test("adds commonjs module", (t) => {
  t.plan(1);
  const design = new plugin.Design(null, "mydesign");

  design.lib("foo", "bar");
  t.equals(design.get("foo"), "module.exports=\"bar\"", "module export");
});

test("adds view with map", (t) => {
  t.plan(1);
  const design = new plugin.Design(null, "mydesign");
  const fn = function(){};
  design.view("foo", fn);
  const doc = design.toJSON();
  t.equals(doc.views.foo.map, fn.toString(), "set view map");
});

test("adds view with map and reduce", (t) => {
  t.plan(2);
  const design = new plugin.Design(null, "mydesign");
  const fn = function(){};
  design.view("foo", fn, fn);
  const doc = design.toJSON();
  t.equals(doc.views.foo.map, fn.toString(), "set view map");
  t.equals(doc.views.foo.reduce, fn.toString(), "set view reduce");
});

["show","list","update","filter"].forEach(type => {
  test(`adds ${type}`, (t) => {
    t.plan(1);
    const design = new plugin.Design(null, "mydesign");
    const fn = function(){};
    design[type]("foo", fn);
    const doc = design.toJSON();
    t.equals(doc[type + "s"].foo, fn.toString(), `set ${type}`);
  });
});

test("adds validate_doc_update", (t) => {
  t.plan(1);
  const design = new plugin.Design(null, "mydesign");
  const fn = function(){};
  design.validate(fn);
  const doc = design.toJSON();
  t.equals(doc.validate_doc_update, fn.toString(), "set validate_doc_update");
});
