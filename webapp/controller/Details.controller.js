sap.ui.define(["sap/ui/core/mvc/Controller",
		"sap/m/MessageToast",
		"sap/ui/core/Fragment",
		'sap/ui/model/Filter',
		'sap/ui/model/json/JSONModel',
		'jquery.sap.global'
	],
	function(Controller, MessageToast, Fragment, Filter, JSONModel, jQuery) {
		"use strict";
		return Controller.extend("sa.B1SL_SUMMIT_2018.controller.Details", {
			/**
			 * Called when a controller is instantiated and its View controls (if available) are already created.
			 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
			 * @memberOf sa.B1SL_SUMMIT_2018.view.Details
			 */
			//	onInit: function() {
			//
			//	},
			/**
			 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
			 * (NOT before the first rendering! onInit() is used for that one!).
			 * @memberOf sa.B1SL_SUMMIT_2018.view.Details
			 */
			//	onBeforeRendering: function() {
			//
			//	},
			/**
			 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
			 * This hook is the same one that SAPUI5 controls get after being rendered.
			 * @memberOf sa.B1SL_SUMMIT_2018.view.Details
			 */
			//	onAfterRendering: function() {
			//
			//	},
			/**
			 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
			 * @memberOf sa.B1SL_SUMMIT_2018.view.Details
			 */
			//	onExit: function() {
			//
			//	}
			/**
			 *@memberOf 
			 */
			handleNavigationWithContext: function() {
				var that = this;
				var entitySet;
				var sRouteName;

				function _onBindingChange(oEvent) {
					// No data for the binding
					if (!that.getView().getBindingContext()) {
						//Need to insert default fallback route to load when requested route is not found.
						that.getOwnerComponent().getRouter().getTargets().display("");
					}
				}

				function _onRouteMatched(oEvent) {
					var oArgs, oView;
					oArgs = oEvent.getParameter("arguments");
					oView = that.getView();
					var sKeysPath = Object.keys(oArgs).map(function(key) {
						var oProp = JSON.parse(decodeURIComponent(oArgs[key]));
						return key + "=" + (oProp.type === "Edm.String" ? "'" + oProp.value + "'" : oProp.value);
					}).join(",");

					oView.bindElement({
						path: entitySet + "(" + sKeysPath + ")",
						events: {
							change: _onBindingChange.bind(that),
							dataRequested: function() {
								oView.setBusy(true);
							},
							dataReceived: function() {
								oView.setBusy(false);
							}
						}
					});
				}

				if (that.getOwnerComponent().getRouter) {
					var oRouter = that.getOwnerComponent().getRouter();
					var oManifest = this.getOwnerComponent().getMetadata().getManifest();
					var content = that.getView().getContent();
					if (content) {
						var oNavigation = oManifest["sap.ui5"].routing.additionalData;
						var oContext = oNavigation[that.getView().getViewName()];
						sRouteName = oContext.routeName;
						entitySet = oContext.entitySet;
						oRouter.getRoute(sRouteName).attachMatched(_onRouteMatched, that);
					}
				}
			},
			onInit: function() {
				this.handleNavigationWithContext();
			},
			/**
			 *@memberOf sa.B1SL_SUMMIT_2018.controller.Details
			 */
			action: function(oEvent) {
				var that = this;
				var actionParameters = JSON.parse(oEvent.getSource().data("wiring").replace(/'/g, "\""));
				var eventType = oEvent.getId();
				var aTargets = actionParameters[eventType].targets || [];
				aTargets.forEach(function(oTarget) {
					var oControl = that.byId(oTarget.id);
					if (oControl) {
						var oParams = {};
						for (var prop in oTarget.parameters) {
							oParams[prop] = oEvent.getParameter(oTarget.parameters[prop]);
						}
						oControl[oTarget.action](oParams);
					}
				});
				var oNavigation = actionParameters[eventType].navigation;
				if (oNavigation) {
					var oParams = {};
					(oNavigation.keys || []).forEach(function(prop) {
						oParams[prop.name] = encodeURIComponent(JSON.stringify({
							value: oEvent.getSource().getBindingContext(oNavigation.model).getProperty(prop.name),
							type: prop.type
						}));
					});
					if (Object.getOwnPropertyNames(oParams).length !== 0) {
						this.getOwnerComponent().getRouter().navTo(oNavigation.routeName, oParams);
					} else {
						this.getOwnerComponent().getRouter().navTo(oNavigation.routeName);
					}
				}
			},
			/*
			 * onAddFreightPress event handler
			 * Call freight backend 
			 */
			onAddFreightPress: function(oEvent) {
				//This code was generated by the layout editor.

				// Get Data from ODataModel V4 /Orders 
				var body = {
					"to": {
						"zip": this.getView().getBindingContext().getProperty("AddressExtension/ShipToZipCode"),
						"country": this.getView().getBindingContext().getProperty("AddressExtension/ShipToCountry")
					}
				};
				// open Freight view
				// from Freight view selection we will get back to Object view
				var oThis = this;
				$.ajax({
					url: "https://freightcalc.cfapps.eu10.hana.ondemand.com/Rates",
					type: "POST",
					data: JSON.stringify(body),
					contentType: "application/json",
					success: function(data) {
						oThis.openFreightDialog(data);
					},
					error: function(jqXHR, textStatus, errorThrown) {
						MessageToast.show("POST Freight error: " + JSON.stringify(jqXHR.responseJSON));
					}
				});
			},
			/*
			* open Freight Dialog to show the providers received from Freight backend
			*/
			openFreightDialog: function(data) {
				var detailsView = this.getView();

				//Create a model and bind the table rows to this model
				var oModel = new sap.ui.model.json.JSONModel();
				// created a JSON model      
				oModel.setData({
					modelData: data
				});

				// create dialog lazily
				if (!this._oDialog) {
					// create dialog via fragment factory
					this._oDialog = sap.ui.xmlfragment("sa.B1SL_SUMMIT_2018.view.Dialog", this);
					this._oDialog.setModel(oModel);
				}
				// connect dialog to view (models, lifecycle)
				detailsView.addDependent(this._oDialog);

				// toggle compact style
				jQuery.sap.syncStyleClass("sapUiSizeCompact", detailsView, this._oDialog);
				this._oDialog.open();
			},
			/*
			* Search button event handler on Freight Dialog
			*/
			handleFreightDialogSearch: function(oEvent) {
				var sValue = oEvent.getParameter("value");
				var oFilter = new Filter("provider", sap.ui.model.FilterOperator.Contains, sValue);
				var oBinding = oEvent.getSource().getBinding("items");
				oBinding.filter([oFilter]);
			},
			/*
			* FreightDialog event handler after the user selects a provider line
			* call updateSO to update the Freight costs in SAP Business One via Service Layer
			*/
			handleFreightDialogConfirm: function(oEvent) {

				// Get SelectedItem details
				var oSelectedItem = oEvent.getParameter("selectedItem");
				var ctx = oSelectedItem.getBindingContext();
				var data = ctx.getModel().getProperty(ctx.getPath());
				var providerDetails = {
					name: data.provider,
					days: data.estimated_days,
					amount: data.amount,
					currency: data.currency
				};

				// Get Order details from current view binding context
				var orderDetails = {
					DocEntry: this.getView().getBindingContext().getProperty("DocEntry")
				};

				// Update Order via Service Layer
				this.updateSO(providerDetails, orderDetails);

				console.log("You have chosen " + providerDetails.name + ", " + providerDetails.days + " Days, " + providerDetails.amount +
					providerDetails.currency + ".");
			},

			handleFreightDialogClose: function(oEvent) {
				MessageToast.show("No Provider selected.");
			},

			/*
			* Update the SAP Business One Order via Service Layer 
			*/
			updateSO: function(providerDetails, orderDetails) {

				var oThis = this;

				var body = {
					"DocEntry": orderDetails.DocEntry,
					"DocumentAdditionalExpenses": [{
						"ExpenseCode": 1,
						"LineTotal": providerDetails.amount,
						"Remarks": providerDetails.name
					}]
				};

				$.ajax({
					url: "/apihub_sandbox/sapb1/b1s/v2/Orders(" + orderDetails.DocEntry + ")",
					type: "PATCH",
					data: JSON.stringify(body),
					contentType: "application/json",
					success: function(data) {
						oThis.soUpdateSuccess(data);
					},
					error: function(e) {
						oThis.soUpdateError(e);
					}
				});
			},

			/*
			* Call back from update Sales Order - success
			*/
			soUpdateSuccess: function(data) {
				// Refresh the Model to update the Order DocTotal we have changed
				this.getView().getBindingContext().getModel().refresh();
				MessageToast.show("Success. Check the DocTotal amount has changed.");
			},
			/*
			* Call back from update Sales Order - error
			*/
			soUpdateError: function(e) {
				MessageToast.show("SL error: " + e);
			}
		});
	});
