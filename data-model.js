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
			tree.nest[prop] = {
				valid: true
			};
			let newPath = Array.from(path);
			newPath.push(prop);
			return wrapLayer(wrappedObj[prop], newPath, tree.nest[prop], model);
		},
		set: function(wrappedObj, prop, newValue, proxy){
			if(!tree.valid){
				wrappedObj[prop] = newValue;
				return true;
			}
			if(_.isArray(wrappedObj) && prop === "length"){
				//Special case - the length property is updated automatically
				//TODO: check for more general cases where this applies
				return true;
			}

			let newPath = Array.from(path);
			newPath.push(prop);
			let oldValue = wrappedObj.hasOwnProperty(prop) ? wrappedObj[prop] : nonexistentMarker;
			wrappedObj[prop] = newValue;
			if(_.isObjectLike(oldValue)){
				if(tree.nest.hasOwnProperty(prop)){
					tree.nest[prop].valid = false;
					delete tree.nest[prop];	
				}
				oldValue = _.cloneDeep(oldValue);
			}
			if(_.isObjectLike(newValue)){
				newValue = _.cloneDeep(newValue);
			}
			model.emit("change", newPath, oldValue, newValue);
			return true;
		},
		deleteProperty: function(wrappedObj, prop){
			let newPath = Array.from(path);
			newPath.push(prop);
			let oldValue = wrappedObj[prop];
			if(_.isObjectLike(oldValue)){
				oldValue = _.cloneDeep(oldValue);
				if(tree.nest.hasOwnProperty(prop)){
					tree.nest[prop].valid = false;
					delete tree.nest[prop];
				}
			}
			let newValue = nonexistentMarker;
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

