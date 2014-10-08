define([
  'jquery',
  'underscore',
  'backbone',
  'views/property/PropertyListItemView'
], function($, _, Backbone, PropertyListItemView){
  var PropertyListView = Backbone.View.extend({
    
    tagName: "div",

    render: function(tags) {

        var properties = this.collection.models;

        $(this.el).html('<div class="thumbnails"></div>');

        for (var i = 0; i <  properties.length; i++) {
            $('.thumbnails', this.el).append(new PropertyListItemView(
                  {model: properties[i]}).render({tags : tags.split(","), index : i}).el);
        }

        return this;
    }

  });

  return PropertyListView;

});