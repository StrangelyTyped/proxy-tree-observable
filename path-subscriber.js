"use strict";

const EventEmitter = require("events").EventEmitter;
const _ = require("lodash");
const NONEXISTENT_MARKER = require("./data-model").NONEXISTENT_MARKER;


let isSubpathOf = function(sourcePath, targetPath){
	if(sourcePath.length >= targetPath.length){
		return _.isEqual(sourcePath.slice(0, targetPath.length), targetPath);
	}
	return false;
};

let isParentPathOf = function(sourcePath, targetPath){
	if(sourcePath.length < targetPath.length){
		return _.isEqual(targetPath.slice(0, sourcePath.length), sourcePath);
	}
	return false;
};

let traverse = function(obj, pathFragment){
	if(obj == null || obj === NONEXISTENT_MARKER){
		return NONEXISTENT_MARKER;
	}
	obj = obj[pathFragment];
	if(obj === undefined){
		obj = NONEXISTENT_MARKER
	}
	return obj;
}

let rebaseEvent = function(evt, subscriberPath){
	let [origPath, oldVal, newVal] = evt;
	let relativePath = subscriberPath.slice(origPath.length);
	relativePath.forEach(pathFragment => {
		oldVal = traverse(oldVal, pathFragment);
		newVal = traverse(newVal, pathFragment);
	});
	if((oldVal !== NONEXISTENT_MARKER || newVal !== NONEXISTENT_MARKER) && oldVal !== newVal){
		return [subscriberPath, oldVal, newVal];
	}
	return null;
};

let parsePath = function(path){
	//This implementation does not guarantee a valid path has been provided
	return _.toPath(path);
};

class PathSubscriber extends EventEmitter {
	constructor(model){
		super();
		let subscriberMap = new Map();
		this.on("removeListener", (eventName) => {
			if(this.listenerCount(eventName) === 0){
				subscriberMap.delete(eventName);
			}
		});
		this.on("newListener", (eventName) => {
			if(this.listenerCount(eventName) === 0){
				let processedEventName = parsePath(eventName);
				if(processedEventName != null){
					subscriberMap.set(eventName, processedEventName);
				}
			}
		});
		model.on("change", (...evtArgs) => {
			//evtArgs either contains array of events (if we're wrapping the buffer) or array+val+val (if we aren't)
			if(evtArgs.length === 1){
				let evtList = evtArgs[0];
				//each entry in evtList is a single event (path+val+val)
				for(let [subscriberName, subscriberPath] of subscriberMap){
					let filteredSubEvents = evtList.filter(evt => isSubpathOf(evt[0], subscriberPath));
					let filteredSuperEvents = evtList.filter(evt => isParentPathOf(evt[0], subscriberPath))
						.map(evt => rebaseEvent(evt, subscriberPath))
						.filter(evt => evt != null);
					let filteredEvents = filteredSubEvents.concat(filteredSuperEvents);
					if(filteredEvents.length){
						this.emit(subscriberName, filteredEvents);
					}
				}
			}else{
				let path = evtArgs[0];
				//This is a single event
				for(let [subscriberName, subscriberPath] of subscriberMap){
					if(isSubpathOf(path, subscriberPath)){
						this.emit(subscriberName, ...evtArgs);
					}else if(isParentPathOf(path, subscriberPath)){
						let modifiedEvent = rebaseEvent(evtArgs, subscriberPath);
						if(modifiedEvent !== null){
							this.emit(subscriberName, ...modifiedEvent);
						}
					}
				}
			}
		});
	}
};

PathSubscriber.NONEXISTENT_MARKER = NONEXISTENT_MARKER;

module.exports = PathSubscriber;
