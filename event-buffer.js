"use strict";

const EventEmitter = require("events").EventEmitter;

//Implementation note: 'once' on the buffered emitter will result in a single event dispatch, but may contain multiple buffered events
class EventBuffer extends EventEmitter {
	constructor(wrappedModel){
		super();
		let immediateHandle = null;
		let bufferMap = new Map();
		const dispatchFunc = () => {
			immediateHandle = null;
			for(let [evtName, evts] of bufferMap){
				this.emit(evtName, evts);
			}
			bufferMap.clear();
		};
		//Note: must register removeListener first, otherwise the wrapped emitter gets a removeListener event registered
		this.on("removeListener", (eventName) => {
			if(this.listenerCount(eventName) === 0){
				wrappedModel.removeAllListeners(eventName);
			}
		});
		this.on("newListener", (eventName) => {
			if(this.listenerCount(eventName) === 0){
				wrappedModel.on(eventName, (...evtArgs) => {
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

	}

};

module.exports = EventBuffer;
