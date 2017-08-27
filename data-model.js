"use strict";

let _ = require("lodash");
let EventEmitter = require("events").EventEmitter;

let nonexistentMarker = Symbol("Property does not exist");

const wrapLayer = function(obj, path, tree, model){
	tree.nest = {};
	let proxy = new Proxy(obj, {
		get: function(wrappedObj, prop, proxy){
			if(!_.isObjectLike(wrappedObj[prop])){
				return wrappedObj[prop];
			}
			if(tree.nest.hasOwnProperty(prop)){
				return tree.nest[prop].proxy;
			}
			tree.nest[prop] = {};
			let newPath = Array.from(path);
			newPath.push(prop);
			return wrapLayer(wrappedObj[prop], newPath, tree.nest[prop], model);
		},
		set: function(wrappedObj, prop, newValue, proxy){
			let newPath = Array.from(path);
			newPath.push(prop);
			let oldValue = wrappedObj.hasOwnProperty(prop) ? wrappedObj[prop] : nonexistentMarker;
			if(_.isObjectLike(oldValue) && !_.isObjectLike(newValue)){
				delete tree.nest[prop];	
			}
			wrappedObj[prop] = newValue;
			model.emit("change", newPath, oldValue, newValue);
		},
		deleteProperty: function(wrappedObj, prop){
			let newPath = Array.from(path);
			newPath.push(prop);
			let oldValue = wrappedObj[prop];
			let newValue = nonexistentMarker;
			delete tree.nest[prop];
			model.emit("change", newPath, oldValue, newValue);
		}
	});
	tree.proxy = proxy;
	return proxy;
};

const wrap = function(obj, model){
	let tree = {};
	let path = [];
	return wrapLayer(obj, path, tree, model);
};


class DataModel extends EventEmitter {
	constructor(model){
		super();
		this.__model = wrap(model || {}, this);
	}

	get model(){ return this.__model }
};

DataModel.NONEXISTENT_MARKER = nonexistentMarker;

module.exports = DataModel;

