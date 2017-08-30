describe("path-subscriber", function() {
	let PathSubscriber = require("../path-subscriber.js");
	let EventEmitter = require("events").EventEmitter;

	let rawEmitter;
	let wrappedEmitter;

	beforeEach(function() {
		rawEmitter = new EventEmitter();
		wrappedEmitter = new PathSubscriber(rawEmitter);
	});

	it("should process dispatched single-events to multiple ancestral paths", function() {
		let receivedEvents = {};
		let subscribedPaths = [
			"path.to.object",
			"path.to",
			"path.to.object.property",
			"path",
			"path.to.object.property.toofar",
			"path.to.other",
			"path.to.other.property"
		];

		subscribedPaths.forEach((path) => {
			receivedEvents[path] = [];
			wrappedEmitter.on(path, (...evts) => receivedEvents[path].push(evts));
		});

		rawEmitter.emit("change", ["path", "to", "object", "property"], 5, 6);

		let expectedDispatchedEvent = [ [ [ "path", "to", "object", "property" ], 5, 6 ] ];
		expect(receivedEvents).toEqual({
			"path.to.object": expectedDispatchedEvent,
			"path.to": expectedDispatchedEvent,
			"path.to.object.property": expectedDispatchedEvent,
			"path": expectedDispatchedEvent,
			"path.to.object.property.toofar": [],
			"path.to.other": [],
			"path.to.other.property": []
		});
	});

	it("should process dispatched multi-events to multiple ancestral paths", function() {
		let receivedEvents = {};
		let subscribedPaths = [
			"path.to.object",
			"path.to",
			"path.to.object.property",
			"path",
			"path.to.object.property.toofar",
			"path.to.other",
			"path.to.other.property"
		];

		subscribedPaths.forEach((path) => {
			receivedEvents[path] = [];
			wrappedEmitter.on(path, (evts) => receivedEvents[path].push(evts));
		});

		rawEmitter.emit("change", [
			[
				["path", "to", "object", "property"], 5, 6
			],
			[
				["path", "to", "unrelated", "property"], 6, 7
			],
			[
				["path", "to", "object", "property"], 8, 9
			]
		]);

		let expectedDispatchedEvent1 = [[
			[ [ "path", "to", "object", "property" ], 5, 6 ],
			[ [ "path", "to", "object", "property" ], 8, 9 ],
		]];

		let expectedDispatchedEvent2 = [[
			[ [ "path", "to", "object", "property" ], 5, 6 ],
			[ [ "path", "to", "unrelated", "property" ], 6, 7 ],
			[ [ "path", "to", "object", "property" ], 8, 9 ],
		]];

		expect(receivedEvents).toEqual({
			"path.to.object": expectedDispatchedEvent1,
			"path.to": expectedDispatchedEvent2,
			"path.to.object.property": expectedDispatchedEvent1,
			"path": expectedDispatchedEvent2,
			"path.to.object.property.toofar": [],
			"path.to.other": [],
			"path.to.other.property": []
		});
	});
});
