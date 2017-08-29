describe("event-buffer", function() {
	let EventBuffer = require("../event-buffer.js");
	let EventEmitter = require("events").EventEmitter;

	let rawEmitter;
	let wrappedEmitter;
	let receivedEvents;

	beforeEach(function() {
		rawEmitter = new EventEmitter();
		wrappedEmitter = new EventBuffer(rawEmitter);

		receivedEvents = [];
	});


	//Note: we're expecting a list of arguments per-event (layer 1), and we're expecting a list of events (layer 2).
	//we then collect all the dispatches up into a list (layer 3), though we only pay attention to the first dispatched argument rather than all of them otherwise we'd introduce a 4th layer

	it("should asynchronously forward events from the underlying emitter", function(done) {
		wrappedEmitter.on("test_event", (evts) => receivedEvents.push(evts));
		expect(rawEmitter.eventNames()).toEqual(["test_event"]);
		rawEmitter.emit("test_event", 1, 2, 3);
		expect(receivedEvents.length).toEqual(0);
		setTimeout(() => {
			expect(receivedEvents).toEqual([[[1, 2, 3]]]);
			done();
		});
	});

	it("should asynchronously forward different types of events simultaneously", function(done) {
		let receivedEvents2 = [];
		wrappedEmitter.on("test_event", (evts) => receivedEvents.push(evts));
		wrappedEmitter.on("other_event", (evts) => receivedEvents2.push(evts));

		expect(rawEmitter.eventNames()).toEqual(["test_event", "other_event"]);

		rawEmitter.emit("test_event", 1, 2, 3);
		rawEmitter.emit("test_event", 3, 0, 4);
		rawEmitter.emit("other_event", "a", 0, null);
		rawEmitter.emit("test_event", 9, "b");
		expect(receivedEvents.length).toEqual(0);
		expect(receivedEvents2.length).toEqual(0);
		setTimeout(() => {
			expect(receivedEvents).toEqual([[
				[1, 2, 3],
				[3, 0, 4],
				[9, "b"]
			]]);
			expect(receivedEvents2).toEqual([[
				["a", 0, null]
			]]);
			done();
		});
	});

	it("should asynchronously forward multiple batches of events", function(done) {
		wrappedEmitter.on("test_event", (evts) => receivedEvents.push(evts));

		rawEmitter.emit("test_event", 1, 2, 3);
		rawEmitter.emit("test_event", "moo");
		expect(receivedEvents.length).toEqual(0);
		setTimeout(() => {
			expect(receivedEvents.length).toEqual(1);
			expect(receivedEvents[0].length).toEqual(2);
			rawEmitter.emit("test_event", 4, "cow");
			rawEmitter.emit("test_event", 9, 3);
			setTimeout(() => {
				expect(receivedEvents).toEqual([
					//Batch 1
					[
						[1, 2, 3],
						["moo"]
					],
					//Batch 2
					[
						[4, "cow"],
						[9, 3]
					]
				]);
				done();
			});
		});
	});

	it("should deregister emitters on the underlying object when removed from the wrapper", function(done) {
		let handler = (evts) => receivedEvents.push(evts);
		//Register & check presence
		wrappedEmitter.on("test_event", handler);
		expect(rawEmitter.eventNames()).toEqual(["test_event"]);
		//Unregister & check absence
		wrappedEmitter.removeListener("test_event", handler);
		expect(rawEmitter.eventNames()).toEqual([]);
		//Emit to check it isn't picked up
		rawEmitter.emit("test_event", 1, 2, 3);
		expect(receivedEvents.length).toEqual(0);
		//re-register & check presence, emit to verify
		wrappedEmitter.on("test_event", handler);
		expect(rawEmitter.eventNames()).toEqual(["test_event"]);
		rawEmitter.emit("test_event", 4, 5, 6);

		setTimeout(() => {
			expect(receivedEvents).toEqual([[
				[4, 5, 6]
			]]);
			receivedEvents.pop();

			//de-register all, verify absence
			wrappedEmitter.removeAllListeners("test_event");
			expect(rawEmitter.eventNames()).toEqual([]);
			rawEmitter.emit("test_event", 7, 8, 9);

			setTimeout(() => {
				expect(receivedEvents).toEqual([]);
				done();
			});
		});
	});

	it("should 'once' right, as defined for this class", function(done){
		wrappedEmitter.once("test_event", (evts) => receivedEvents.push(evts));
		expect(rawEmitter.eventNames()).toEqual(["test_event"]);

		rawEmitter.emit("test_event", 1, 2, 3);
		rawEmitter.emit("test_event", 4);
		rawEmitter.emit("test_event", 5, 6);

		expect(receivedEvents.length).toEqual(0);

		setTimeout(() => {
			expect(receivedEvents).toEqual([[
				[1, 2, 3],
				[4],
				[5, 6]
			]]);
			expect(rawEmitter.eventNames()).toEqual([]);
			done();
		});
	});
});
