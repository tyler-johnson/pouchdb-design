import test from "tape";
import plugin from "../src/index.js";

function exec(source, scope) {
  const keys = [];
  const values = [];
  for (let key in scope) {
    if (scope.hasOwnProperty(key)) {
      keys.push(key);
      values.push(scope[key]);
    }
  }
  keys.push("return (" + source.replace(/;\s*$/, "") + ");");
  return Function.apply(null, keys).apply(null, values);
}

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
  const adder = function(n) {
    return n + n;
  };
  design.set("foo", adder);
  const fn = exec(design.get("foo"));
  t.equals(fn(2), 4, "set a function");
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
  const adder = function(n) {
    return n + n;
  };
  design.view("foo", adder);
  const doc = design.toJSON();
  t.equals(exec(doc.views.foo.map)(2), 4, "set view map");
});

test("adds view with map and reduce", (t) => {
  t.plan(2);
  const design = new plugin.Design(null, "mydesign");
  const adder = function(n) {
    return n + n;
  };
  design.view("foo", adder, adder);
  const doc = design.toJSON();
  t.equals(exec(doc.views.foo.map)(2), 4, "set view map");
  t.equals(exec(doc.views.foo.reduce)(2), 4, "set view reduce");
});

["show","list","update","filter"].forEach(type => {
  test(`adds ${type}`, (t) => {
    t.plan(1);
    const design = new plugin.Design(null, "mydesign");
    const adder = function(n) {
      return n + n;
    };
    design[type]("foo", adder);
    const doc = design.toJSON();
    t.equals(exec(doc[type + "s"].foo)(2), 4, `set ${type}`);
  });
});

test("adds validate_doc_update", (t) => {
  t.plan(1);
  const design = new plugin.Design(null, "mydesign");
  const adder = function(n) {
    return n + n;
  };
  design.validate(adder);
  const doc = design.toJSON();
  t.equals(exec(doc.validate_doc_update)(2), 4, "set validate_doc_update");
});

test("add named function", (t) => {
  t.plan(1);
  const design = new plugin.Design(null, "mydesign");
  function adder(n) {
    return n + n;
  }
  design.set("name_test", adder);
  t.equals(exec(design.get("name_test"))(2), 4, "set named function");
});
