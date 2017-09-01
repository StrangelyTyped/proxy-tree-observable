describe("path-subscriber", function() {
	let PathSubscriber = require("../path-subscriber.js");
	let EventEmitter = require("events").EventEmitter;
	let NONEXISTENT_MARKER = PathSubscriber.NONEXISTENT_MARKER;

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
			"path.to.object.property2",
			"path.to.object.prop",
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
			"path.to.object.property2": [],
			"path.to.object.prop": [],
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
			"path.to.object.property2",
			"path.to.object.prop",
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
			"path.to.object.property2": [],
			"path.to.object.prop": [],
			"path.to.other": [],
			"path.to.other.property": []
		});
	});

	it("should un-nest single-events from higher in the object heirarchy to dispatch to affected deeper subscriptions", function() {
		let receivedEvents = {};
		let subscribedPaths = [
			"path.to.object",
			"path.to",
			"path.to.object.property",
			"path",
			"path.to.object.property.toofar",
			"path.to.object.property2",
			"path.to.object.prop",
			"path.to.other",
			"path.to.other.property"
		];

		subscribedPaths.forEach((path) => {
			receivedEvents[path] = [];
			wrappedEmitter.on(path, (...evts) => receivedEvents[path].push(evts));
		});

		rawEmitter.emit("change", ["path", "to"], { object: { property: 5 } }, { other: { property: 6 } });

		let expectedDispatchedEvent1 = [ [ [ "path", "to", "object", "property" ], 5, NONEXISTENT_MARKER ] ];
		let expectedDispatchedEvent2 = [ [ [ "path", "to", "object" ], { property: 5 }, NONEXISTENT_MARKER ] ];
		let expectedDispatchedEvent3 = [ [ [ "path", "to" ], { object: { property: 5 } }, { other: { property: 6 } } ] ];
		let expectedDispatchedEvent4 = [ [ [ "path", "to", "other" ], NONEXISTENT_MARKER, { property: 6 } ] ];
		let expectedDispatchedEvent5 = [ [ [ "path", "to", "other", "property" ], NONEXISTENT_MARKER, 6 ] ];
		expect(receivedEvents).toEqual({
			"path.to.object": expectedDispatchedEvent2,
			"path.to": expectedDispatchedEvent3,
			"path.to.object.property": expectedDispatchedEvent1,
			"path": expectedDispatchedEvent3,
			"path.to.object.property.toofar": [],
			"path.to.object.property2": [],
			"path.to.object.prop": [],
			"path.to.other": expectedDispatchedEvent4,
			"path.to.other.property": expectedDispatchedEvent5
		});
	});

	it("should un-nest multi-events from higher in the object heirarchy to dispatch to affected deeper subscriptions", function() {
		let receivedEvents = {};
		let subscribedPaths = [
			"path.to.object",
			"path.to",
			"path.to.object.property",
			"path",
			"path.to.object.property.toofar",
			"path.to.object.property2",
			"path.to.object.prop",
			"path.to.other",
			"path.to.other.property"
		];

		subscribedPaths.forEach((path) => {
			receivedEvents[path] = [];
			wrappedEmitter.on(path, (evts) => receivedEvents[path].push(evts));
		});

		rawEmitter.emit("change", [
			[
				["path", "to"],
				{
					object: {
						property: 8
					}
				},
				{
					object: {
						property: 9
					}
				}
			]
		]);

		let expectedDispatchedEvent1 = [[
			[ [ "path", "to" ], { object: { property: 8 } }, { object: { property: 9 } } ],
		]];

		let expectedDispatchedEvent2 = [[
			[ [ "path", "to", "object" ], { property: 8 }, { property: 9 } ],
		]];

		let expectedDispatchedEvent3 = [[
			[ [ "path", "to", "object", "property" ], 8, 9 ],
		]];

		expect(receivedEvents).toEqual({
			"path.to.object": expectedDispatchedEvent2,
			"path.to": expectedDispatchedEvent1,
			"path.to.object.property": expectedDispatchedEvent3,
			"path": expectedDispatchedEvent1,
			"path.to.object.property.toofar": [],
			"path.to.object.property2": [],
			"path.to.object.prop": [],
			"path.to.other": [],
			"path.to.other.property": []
		});
	});

	it("should use the sentinel value to indicate parts of the tree where no value remains when un-nesting events", function() {
		let receivedEvents = {};
		let subscribedPaths = [
			"path.to.object",
			"path.to",
			"path.to.object.property",
			"path",
			"path.to.object.property.toofar",
			"path.to.object.property2",
			"path.to.object.prop",
			"path.to.other",
			"path.to.other.property"
		];

		subscribedPaths.forEach((path) => {
			receivedEvents[path] = [];
			wrappedEmitter.on(path, (evts) => receivedEvents[path].push(evts));
		});

		rawEmitter.emit("change", [
			[
				["path", "to"],
				{
					object: {
						property: 8
					}
				},
				{
					other: {
						property: 9
					}
				}
			]
		]);

		let expectedDispatchedEvent1 = [[
			[ [ "path", "to" ], { object: { property: 8 } }, { other: { property: 9 } } ],
		]];

		let expectedDispatchedEvent2 = [[
			[ [ "path", "to", "object" ], { property: 8 }, NONEXISTENT_MARKER ]
		]];

		let expectedDispatchedEvent3 = [[
			[ [ "path", "to", "object", "property" ], 8, NONEXISTENT_MARKER ]
		]];

		let expectedDispatchedEvent4 = [[
			[ [ "path", "to", "other", "property" ], NONEXISTENT_MARKER, 9 ]
		]];

		let expectedDispatchedEvent5 = [[
			[ [ "path", "to", "other" ], NONEXISTENT_MARKER, { property: 9 } ]
		]];

		expect(receivedEvents).toEqual({
			"path.to.object": expectedDispatchedEvent2,
			"path.to": expectedDispatchedEvent1,
			"path.to.object.property": expectedDispatchedEvent3,
			"path": expectedDispatchedEvent1,
			"path.to.object.property.toofar": [],
			"path.to.object.property2": [],
			"path.to.object.prop": [],
			"path.to.other": expectedDispatchedEvent5,
			"path.to.other.property": expectedDispatchedEvent4
		});
	});
});
