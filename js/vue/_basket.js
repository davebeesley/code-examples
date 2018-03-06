/*------------------------------------*\
    BASKET

	Handle reactive basket changes and stripe integration
\*------------------------------------*/
const Helpers = require('../helpers');

window.Vue = require('vue');
const VueResource = require('vue-resource');

Vue.use(VueResource);

// Intercept commication with Laravel and add token
Vue.http.interceptors.push((request, next) => {
	request.headers.set('X-CSRF-TOKEN', Laravel.csrfToken);
	next();
});

// Load password elements
var baskets = Helpers.getElems('[data-module="basket"]');
var siteNavAlerts = Helpers.getElems('.js-site-nav__alert');

if(baskets.length) {

	// Loop each instance
	Helpers.loopElems(baskets, function() {

		const basket = this;
        const basketData = basket.dataset;

        new Vue({
			el: basket,
			data: {
				currencySymbol: '£',
				userEmail: basketData.email,
				stripeEmail: '',
				stripeToken: '',
				stripeCustomer: basketData.customer,
				memberships: Helpers.parseJSON(basketData.memberships, []),
				donations: Helpers.parseJSON(basketData.donations, []),
				checkedMemberships: [],
				checkedDonations: [],
				buttonDisabled: false,
				cardNumber: '',
				expiryMonth: '',
				expiryYear: '',
				cvc: '',
				name: basketData.name,
				address1: basketData.address1,
				address2: basketData.address2,
				address3: basketData.address3,
				city: basketData.city,
				county: basketData.county,
				postcode: basketData.postcode,
				country: basketData.country,
				chosenCard: basketData.card,
				additionalCard: true,
				billingAddress: true,
				buttonText: 'Confirm & Pay',
				buttonTextDefault: 'Confirm & Pay',
				processingText: 'Processing...',
				buttonState: [
					'button'
				],
				dots: '...',
				selectionState: 'selected'
			},

			watch: {

				// Toggle new card according to radio options
				chosenCard(val) {

					const self = this;

					if (val === 'card_new') {
						return self.additionalCard = true;
					}

					return self.additionalCard = false;
				},

				// Calculate the total price to pay 
				totalPrice(val) {

					const self = this;

					// Set the default button text
					self.buttonTextDefault = 'Confirm & Pay (' + self.formattedPrice + ')';

					// Set that text if not processing
					if (self.buttonText !== self.processingText) {
						self.buttonText = self.buttonTextDefault;
					}

					// Disable the button because nothing can happen if there's nothing to pay
					if (val === 0) {
						self.buttonState.push('button--disabled');
						return self.buttonDisabled = true;
					}

					// Remove the button state modifier if it's here at this point
					if (self.buttonState.indexOf('button--disabled') > -1) {
						self.buttonState.splice(self.buttonState.indexOf('button--disabled'), 1);
					}

					// A default return of !self.buttonDisabled
					return self.buttonDisabled = false;
				},

				billingAddress(val) {
					const self = this;
					
					if (!val) {
						self.address1 = '',
						self.address2 = '',
						self.address3 = '',
						self.city = '',
						self.county = '',
						self.postcode = '',
						self.country = ''
					} else {
						self.address1 = basketData.address1,
						self.address2 = basketData.address2,
						self.address3 = basketData.address3,
						self.city = basketData.city,
						self.county = basketData.county,
						self.postcode = basketData.postcode,
						self.country = basketData.country
					}
				}
			},

			computed: {

				// Build total price
				totalPrice() {
					
					const self = this;

		        	var price = 0;

		        	for (let id of self.checkedMemberships) {
		        		price += self.getPrice(parseInt(id, 10), 'membership');
		        	}

		        	for (let id of self.checkedDonations) {
		        		price += self.getPrice(parseInt(id, 10), 'donation');
		        	}

		        	return price;
				},

				// Human format price
				formattedPrice() {

					const self = this;

					return self.currencySymbol + (self.totalPrice / 100).toFixed(2);
				},
				
				// Keep card details data up to date
				cardDetails() {

					const self = this;

					const cardDetails = {
						'number': self.cardNumber,
						'name': self.name,
						'exp_month': self.expiryMonth,
						'exp_year': self.expiryYear,
						'cvc': self.cvc,
				        'address_line1': self.address1,
				        'address_line2': self.address2 + ' ' + self.address3,
				        'address_city': self.city,
				        'address_state': self.county,
						'address_zip': self.postcode,
				        'address_country': self.country,
					};

					// Globally store a flag for if this is a stripe customer
					if (self.stripeCustomer) {
						cardDetails.customer = self.stripeCustomer;
					}

					return cardDetails;
				},

				// Merge button classes into a attribute ready format
				buttonClasses() {

					const self = this;

					return self.buttonState.join(' ');
				},

				// Return a cumulative total of all basket items
				itemCount() {

					const self = this;

					return self.memberships.length + self.donations.length;
				}
			},

			methods: {

				// Select all line item's checkboxes
				selectAll() {
					
					const self = this;

					self.deselectAll();
					
			    	for (let membership of self.memberships) {
			    		self.checkedMemberships.push(membership.id);
			    	}
					
			    	for (let donation of self.donations) {
			    		self.checkedDonations.push(donation.id);
			    	}

					// Set button display state
					self.selectionState = 'selected';
				},

				// Deselect all line item's checkboxes
				deselectAll() {
					
					const self = this;

					self.checkedMemberships.splice(0);
					self.checkedDonations.splice(0);

					// Set button display state
					self.selectionState = 'deselected';
				},

				displayError(errorMessage) {

					const self = this;
					
					// Push error text and a negative CSS modifier
					self.buttonState.push('button--color-red');
					self.buttonText = errorMessage;

					// Set a timeout so the user can read the button
					setTimeout(function () {

						// De-disable the button
						self.buttonDisabled = false;

						// Remove negative modifiers
						if (self.buttonState.indexOf('button--disabled') > -1) {
							self.buttonState.splice(self.buttonState.indexOf('button--disabled'), 1);
						}
						if (self.buttonState.indexOf('button--color-red') > -1) {
							self.buttonState.splice(self.buttonState.indexOf('button--color-red'), 1);
						}

						// Reset the text
						self.buttonText = self.buttonTextDefault;

					}, 2500);
				},

				// Process stripe response with Ajax
				processOrder() {

					const self = this;

					// Post to the route
					self.$http.post('/orders', {
						customerExists: (self.stripeCustomer ? true : false),
						stripeToken: self.stripeToken || false,
						stripeEmail: self.userEmail,
						card: self.chosenCard,
						memberships: self.checkedMemberships,
						donations: self.checkedDonations,
						enteredPostcode: self.postcode
					})
			    	.then((response) => {

						// Redirect the user if all went well
						if (response.body.statusCode === 200) {
							return window.location.href = '/orders/' + response.body.order_id;
						}

						// Otherwise, fire off the error handler
						self.displayError(response.body.message);

					})
					.catch((error) => {
						return alert(error.body.statusText);
					});

				},

				// Handle what strip send back
				stripeResponseHandler(status, response) {

					const self = this;

					// If all is not well
					if (response.error) {

						// Store errors 
						self.errors = response.error.message;

						// Set negative button states
					    self.buttonDisabled = false;
						self.buttonText = 'Confirm & Pay (' + self.formattedPrice + ')';

						// Fire off the error handler
						self.displayError(response.error.message);

					    return false;
					}
					
					// All is well, so set stripe token and process order
					self.stripeToken = response.id;
					return self.processOrder(true, true);
				},
				
				// Attempt to "pre-auth" with stripe to get a token
				pay() {

					const self = this;

					// Don't allow multiple post-backs (user could still press enter)
					if(self.buttonDisabled) {
						return;
					}

					// Disable the text so user can't multiple post
					self.buttonDisabled = true;
					self.buttonText = self.processingText;

					// If a returning customer is using a stored card, "just" process the order
					if (self.stripeCustomer && self.chosenCard != 'card_new') {
						return self.processOrder(true);
					}

					// Post out to Strip and receive with the response handler
					return Stripe.card.createToken(self.cardDetails, self.stripeResponseHandler);
					
				},

				// Attempt to load a membership
				getMembershipById(id) {

					const self = this;
					
					return self.memberships.find(membership => membership.id === id);
				},

				// Attempt to load a donation
				getDonationById(id) {

					const self = this;

					return self.donations.find(donation => donation.id === id);
				},

				// Get an item price
				getPrice(id, type) {

					const self = this;
					var price = 0;

					switch (type) {
						case 'membership':

							const membershipItem = self.getMembershipById(id);

							if(typeof(membershipItem) !== 'undefined') {
								price = membershipItem.level.price;
							}
							
							break;

						case 'donation':

							const donationItem = self.getDonationById(id);

							if(typeof(donationItem) !== 'undefined') {
								price = donationItem.amount;
							}
							
							break;
					}

					return price;
				},

				// Fired on checkbox change. Will update related collection of checked items
				updateCheckedItems(evt, id, type) {

					const self = this;
					
					switch(type) {

						case 'membership':

							evt.target.checked ? self.checkedMemberships.push(id) : self.checkedMemberships.splice(self.checkedMemberships.indexOf(id), 1);
							break;

						case 'donation':

							evt.target.checked ? self.checkedDonations.push(id) : self.checkedDonations.splice(self.checkedDonations.indexOf(id), 1);
							break;
					}

				},

				// Delete a line item visually and via ajax
				deleteLineItem(evt, id, type) {

					const self = this;

					var url = '';
					switch(type) {

						case 'membership':

							// Set the ajax url
							url = '/horse-membership/' + id;

							// Confirm the action
							if(!confirm('Are you sure you want to delete this membership?')) {
								return;
							}

							// Remove from local checked collection
							self.checkedMemberships.splice(self.checkedMemberships.indexOf(id), 1);
							
							// Loop the memberships and delete the version we want to delete
							for(let i = 0; i < self.memberships.length; i++) {
								if(self.memberships[i].id === id) {
									self.memberships.splice(i, 1);
								}
							}

							// Update the nav alert
							self.updateSiteNavAlert('horses');
							
							break;

						case 'donation':

							// Set the ajax url 
							url = '/donations/' + id;

							// Confirm the action
							if(!confirm('Are you sure you want to delete this donation?')) {
								return;
							}

							// Remove from local checked collections 
							self.checkedDonations.splice(self.checkedDonations.indexOf(id), 1);

							// Loop the donations and delete the version we want to delete
							for(let i = 0; i < self.donations.length; i++) {
								if(self.donations[i].id === id) {
									self.donations.splice(i, 1);
								}
							}

							// Update the nav alert
							self.updateSiteNavAlert('donations');

							break;
					}

					// Post out to the respective route
					self.$http.delete(url)
							.then(() => {
								console.log('Item successfully deleted');
							})
							.catch((error) => {
								console.error(error);
							});
				},

				// Attempt to update site nav alert based on basket updates
				updateSiteNavAlert(key) {
					
					const self = this;

					// Loop each alert item
					for(let siteNavAlert of siteNavAlerts) {
						
						if(siteNavAlert.dataset.key === key) {
							
							var currentCount = 0;
							var newCount = 0;

							// Get the current count
							if(typeof(siteNavAlert.dataset.currentCount) !== 'undefined') {
								currentCount = parseInt(siteNavAlert.dataset.currentCount, 10);
							}

							// Get a count from the relative collection
							switch(key) {
								case 'horses':

									newCount = self.memberships.length;
									break;
								case 'donations':

									newCount = self.donations.length;
									break;
							}

							// Add the other count (horses waiting for approval etc)
							if(typeof(siteNavAlert.dataset.otherCount) !== 'undefined') {
								newCount += parseInt(siteNavAlert.dataset.otherCount, 10);
							}

							if(newCount <= 0) {

								// TODO: we need to find the parent in a more scalable way
								siteNavAlert.parentNode.parentNode.style.display = 'none';
								return;
							}

							// Set the new data
							siteNavAlert.dataset.currentCount = newCount;
							siteNavAlert.textContent = newCount;
						}
					}
				}
			},

			// Module load
            created() {

				const self = this;

				// Hide the additional card panel by default
				if (self.stripeCustomer) {
					self.additionalCard = false;
				}

				// Populate memberships
		    	for (let membership of self.memberships) {
		    		self.checkedMemberships.push(membership.id);
		    	}


				// Populate donations
		    	for (let donation of self.donations) {
		    		self.checkedDonations.push(donation.id);
		    	}

            }
		});
	});

}