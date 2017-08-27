"use strict";

const EventEmitter = require("events").EventEmitter;

class EventBuffer extends EventEmitter {
	constructor(wrappedModel){
		super();
		let immediateHandle = null;
		let bufferMap = new Map();
		const dispatchFunc = () => {
			immediateHandle = null;
			for(let [evtName, evts] of bufferMap){
				this.emit(key, evts);
			}
			bufferMap.clear();
		};
		this.on("newListener", (eventName) => {
			if(this.listenerCount(eventName) === 0){
				wrappedModel.on(eventName, (evtName, ...evtArgs) => {
					if(!bufferMap.has(eventName)){
						bufferMap.set(eventName, []);
					}
					bufferMap.get(eventName).push(evtArgs);
					if(!immediateHandle){
						immediateHandle = setImmediate(dispatchFunc);
					}
				});
			}
		});
		this.on("removeListener", (eventName) => {
			if(this.listenerCount(eventName) === 0){
				wrappedModel.removeAllListeners(eventName);
			}
		});
		
	}
	
};

module.exports = EventBuffer;

