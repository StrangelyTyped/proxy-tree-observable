describe("data-model", function() {
	let DataModel = require("../data-model.js");
	
	let modelUnderTest;
	let receivedEvents;
	
	beforeEach(function() {
		let testObject = {
			tcx: {
				name: "Transactional Customer Experiences",
				ceo: "James Masters",
				sharePrice: 245.12,
				employees: [
					"Ed O'Connell",
					"Estefania Sawayn"
				],
				products: {
					NNX01: "Basic Services",
					NNX02: "Advanced Services"
				}
			},
			mrn: {
				name: "Micro-Resonator Nanotechnologies",
				ceo: "Willie Armstrong",
				sharePrice: 104,
				employees: [
					"Ettie McClure",
					"Jasmin Stroman",
					"Timmy Romaguera"
				],
				products: {
					A001X: "2nm Standard Resonator",
					A002X: "2nm High-tensile Resonator",
					A003X: "1nm Low-resolution Resonator"
				}
			}
		};
		
		modelUnderTest = new DataModel(testObject);
		
		receivedEvents = [];
		modelUnderTest.on("change", (...evtArgs) => { receivedEvents.push(evtArgs); });
	});

	it("should emit events when existing values on the model are modified", function() {
		modelUnderTest.model.mrn.sharePrice = 123.45;
		let expectedEvents = [
			[
				[ "mrn", "sharePrice" ],
				104,
				123.45
			]
		];
		expect(receivedEvents).toEqual(expectedEvents);
	});

	it("should emit events when new values are added to the model", function(){
		modelUnderTest.model.tcx.parentCompany = "mrn";
		let expectedEvents = [
			[
				[ "tcx", "parentCompany" ],
				DataModel.NONEXISTENT_MARKER,
				"mrn"
			]
		];
		expect(receivedEvents).toEqual(expectedEvents);
	});

	it("should emit events when deep parts of the model are modified", function(){
		modelUnderTest.model.tcx.products["A004X"] = "3nm Budget Resonator";
		let expectedEvents = [
			[
				[ "tcx", "products", "A004X" ],
				DataModel.NONEXISTENT_MARKER,
				"3nm Budget Resonator"
			]
		];
		expect(receivedEvents).toEqual(expectedEvents);
	});

	it("should emit events when arrays within the model are modified", function(){
		modelUnderTest.model.tcx.employees.push("David Sanderson");
		let expectedEvents = [
			[
				[ "tcx", "employees", "2" ],
				DataModel.NONEXISTENT_MARKER,
				"David Sanderson"
			]
		];
		expect(receivedEvents).toEqual(expectedEvents);
	});

	it("should emit events when entire objects within the model are replaced", function(){
		modelUnderTest.model.mrn.employees = [
			"Khalil Baumbach",
			"Bernardo McCullough"
		];
		let expectedEvents = [
			[
				[ "mrn", "employees" ],
				[ "Ettie McClure", "Jasmin Stroman", "Timmy Romaguera" ],
				[ "Khalil Baumbach", "Bernardo McCullough" ]
			]
		];
		expect(receivedEvents).toEqual(expectedEvents);
	});

	it("should emit events when entire objects within the model have been replaced", function(){
		modelUnderTest.model.mrn.products = {
			B001X: "New Super 5nm Resonator"
		};
		modelUnderTest.model.mrn.products.B002X = "New Super 5nm Resonator DeLuxe";
		let expectedEvents = [
			[
				[ "mrn", "products" ],
				{
					A001X: "2nm Standard Resonator",
					A002X: "2nm High-tensile Resonator",
					A003X: "1nm Low-resolution Resonator"
				},
				{
					B001X: "New Super 5nm Resonator"
				}
			],
			[
				[ "mrn", "products", "B002X" ],
				DataModel.NONEXISTENT_MARKER,
				"New Super 5nm Resonator DeLuxe"
			]
		];
		expect(receivedEvents).toEqual(expectedEvents);
	});

	it("should emit events when objects and values are deleted from the model entirely", function(){
		modelUnderTest.model.mrn.products.A001X = undefined;
		modelUnderTest.model.mrn.products.A002X = null;
		delete modelUnderTest.model.mrn.products.A003X;
		delete modelUnderTest.model.mrn.employees;

		let expectedEvents = [
			[
				[ "mrn", "products", "A001X" ],
				"2nm Standard Resonator",
				undefined
			],
			[
				[ "mrn", "products", "A002X" ],
				"2nm High-tensile Resonator",
				null
			],
			[
				[ "mrn", "products", "A003X" ],
				"1nm Low-resolution Resonator",
				DataModel.NONEXISTENT_MARKER
			],
			[
				[ "mrn", "employees" ],
				[ "Ettie McClure", "Jasmin Stroman", "Timmy Romaguera" ],
				DataModel.NONEXISTENT_MARKER
			],
		];
		expect(receivedEvents).toEqual(expectedEvents);
	});

	it("should ensure that events are not modified by subsequent changes to the model", function(){
		let oldEmployees = modelUnderTest.model.mrn.employees;
		let newEmployees = [ "Brian Wilkinson" ];
		modelUnderTest.model.mrn.employees = newEmployees;
		newEmployees.push("Tom Tomkinson");
		oldEmployees.push("Bob Pinkington");
		let expectedEvents = [
			[
				[ "mrn", "employees" ],
				[ "Ettie McClure", "Jasmin Stroman", "Timmy Romaguera" ],
				[ "Brian Wilkinson" ]
			]
		];
		expect(receivedEvents).toEqual(expectedEvents);
	});
	
	it("should ensure that nested objects removed from the model do not continue to emit events", function(){
		//Take a reference to the existing part of the model to check for subsequent modification
		let oldEmployees = modelUnderTest.model.mrn.employees;

		//Replace that part of the model entirely, this will emit an event
		modelUnderTest.model.mrn.employees = [ "Brian Wilkinson" ];
		let newEmployees = modelUnderTest.model.mrn.employees;

		//Modify the old part of the model, no event should be produced for this
		oldEmployees.push("Bob Pinkington");

		//Modify the new part of the model, this should emit an event
		newEmployees.push("Lexus Donnelly");

		//Swap back the employee objects, this will emit an event
		modelUnderTest.model.mrn.employees = oldEmployees;
		let oldEmployees2 = modelUnderTest.model.mrn.employees;

		//At this point oldEmployees (while initially part of the model) has been detatched and is not effectively part of the model
		//oldEmployees2 is the 'live' reference, retrieved from the model as at the beginning of this test, only oldEmployees2 modifications should emit events
		newEmployees.push("Ms. Elsie Mitchell");
		oldEmployees.push("Korbin Hayes");
		oldEmployees2.push("Delores Greenfelder");

		
		let expectedEvents = [
			[
				[ "mrn", "employees" ],
				[ "Ettie McClure", "Jasmin Stroman", "Timmy Romaguera" ],
				[ "Brian Wilkinson" ]
			],
			[
				[ "mrn", "employees", "1" ],
				DataModel.NONEXISTENT_MARKER,
				"Lexus Donnelly"
			],
			[
				[ "mrn", "employees" ],
				[ "Brian Wilkinson", "Lexus Donnelly" ],
				[ "Ettie McClure", "Jasmin Stroman", "Timmy Romaguera", "Bob Pinkington" ],
			],
			[
				[ "mrn", "employees", "5" ],
				DataModel.NONEXISTENT_MARKER,
				"Delores Greenfelder"
			]
		];
		expect(receivedEvents).toEqual(expectedEvents);
		expect(modelUnderTest.model.mrn.employees).toEqual([
			"Ettie McClure",
			"Jasmin Stroman",
			"Timmy Romaguera",
			"Bob Pinkington",
			"Korbin Hayes",
			"Delores Greenfelder"
		]);
	});
});
