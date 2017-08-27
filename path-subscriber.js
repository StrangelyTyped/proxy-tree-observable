"use strict";

const EventEmitter = require("events").EventEmitter;


//TODO: if the change occurs higher in the tree than the subscriber is subscribed, then the subscriber should also be notified
//But the event needs to be processed to obtain the right nested old/new values

class PathSubscriber extends EventEmitter {
	constructor(model){
		model.on("change", (evt, ...evtArgs) => {
			let subsciberPaths = this.eventNames();
			//evtArgs either contains array of events (if we're wrapping the buffer) or array+val+val (if we aren't)
			if(evtArgs.length === 1){
				let evtList = evtArgs[0];
				//each entry in evtList is a single event (path+val+val)
				for(let subscriber of subscriberPaths){
					let filteredEvents = evtList.filter((evt) => {
						let changePath = evt[0].join(".");
						return changePath.length >= subscriber.length && changePath.substr(0, subscriber.length) === subscriber;
					});
					if(filteredEvents.length){
						this.emit(subscriber, filteredEvents);
					}
				}
			}else{
				let [path, oldVal, newVal] = evtArgs;
				//This is a single event
				let changePath = path.join(".");
				for(let subscriber of subscriberPaths){
					if(changePath.length >= subscriber.length && changePath.substr(0, subscriber.length) === subscriber){
						this.emit(subscriber, evtArgs);
					}
				}
			}
		});
	}
};

module.exports = PathSubscriber;
