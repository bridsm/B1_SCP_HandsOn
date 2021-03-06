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