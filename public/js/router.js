define([
	'jquery',
	'underscore',
	'backbone',
	'collections/Properties',
	'views/HomeView',
	'views/property/PropertyListView'
], function($, _,  Backbone, PropertyCollection, HomeView, PropertyListView){

	var Router = Backbone.Router.extend({

		routes : {
			'propertyOR/tags/:tags' : 'showPropertyOR',
			'propertyOR/towns/:towns' : 'showPropertyTowns',
			'propertyOR/tags/:tags/towns/:towns' : 'showPropertyOR',
			'*default' : 'showHome'
		},

		changeView : function(view, params){
			function setView(view, params){
				if(this.currentView){
					this.currentView.close();
				}
				this.currentView = view;
				$('.container').html(view.render(params).el);
			}
			setView(view, params);
		},
		showHome : function() {
			var homeView = new HomeView();
			this.changeView(homeView);
		},
		showPropertyTowns: function(towns) {
			this.showPropertyOR(null, towns);
		},
		showPropertyOR : function(tags, towns) {
			var properties = new PropertyCollection();
			var that = this;

			if(tags) {
				properties.url += '/any/' + tags 	
			}

			if(towns) {
				properties.url += '/towns/' + towns 	
			}

			properties.fetch({
				success : function(collection, response) {
					var propertiesView = new PropertyListView({collection : collection});
					that.changeView(propertiesView, { tags : tags, towns : towns});
				}
			});
		},
		fetchError : function(error){
		}
	});

	return Router;
});
