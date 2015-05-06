define(
    [
        'jquery',
        'underscore',
        'templates',
        'config',
        'mapbox',
        'api/analytics'
    ],
    function (jQuery, _, templates, config, L, Analytics) {
        var app = app || {};

        app.objData = {};

        app.init = function () {
            app.loadData();
        };

        var iconSize = 40;
        var iconAnchor = [iconSize / 2, iconSize / 2];
        var popupAnchor = [0, - (iconSize / 2)];

        var $detailPanel;

        app.loadData = function () {
            var hostname = window.location.hostname;
            var strURL;

            if (hostname != "www.gannett-cdn.com") {
                strURL = "http://" + hostname + "/services/webproxy/?url=" + "http://www.gannett-cdn.com/experiments/usatoday/2015/05/isil-arrests/data/data.json";
            } else {
                strURL = "http://www.gannett-cdn.com/experiments/usatoday/2015/05/isil-arrests/data/data.json";
            }

            if (hostname != "localhost") {
                jQuery.getJSON(strURL, function (data) { //"http://" + hostname + "/services/webproxy/?url=" + strURL, function (data)
                    console.log(data);
                    app.objData = data[0];
                    app.render();
                    app.setupMap();
                });
            } else {
                jQuery.getJSON('/data/data.json', function (data) {
                    console.log(data);
                    app.objData = data[0];
                    app.render();
                    app.setupMap();
               });
            }
        };

        app.render = function() {
            $('.iapp-page-wrap').html(templates['app.html']({head: app.objData.project_head, chatter: app.objData.chatter, note: app.objData.note, source: app.objData.source, credits: app.objData.credits}));
            $('.iapp-share-wrap').html(templates['share.html'](app.createShare(app.objData.project_share)));
            $detailPanel = $(".iapp-detail-panel");

            $(".social-popup").click(app.socialClick);
        };

        app.setupMap = function () {
            var strImageBase = "http://www.gannett-cdn.com/experiments/usatoday/2015/05/broadway/images/";
            jQuery(".js-head").html(app.objData.project_head);
            jQuery(".js-chatter").html(app.objData.chatter);
            L.mapbox.accessToken = 'pk.eyJ1IjoiZGdhaW5lciIsImEiOiJyWkE2bndZIn0.dMIRp-JYsg6ZJRKsMu9-nA';
            var zoomLevel = 4;
            if (config.isMobile) {
                zoomLevel = 3;
            }
            var map = L.mapbox.map('map', 'usatodaygraphics.basemap', {
                maxZoom: 8
            }).setView([39.50, -98.35], zoomLevel);

            L.control.scale().addTo(map);

            var geoJson = {};
            geoJson.type = "FeatureCollection";
            geoJson.features = [];
            jQuery.each(app.objData.cities, function(index){
                var dataObj = app.objData.cities[index];
                console.log(dataObj.city_geocode);
                var feature = {};
                feature.type = "Feature";
                feature.properties = {};
                feature.properties.title = dataObj.city_geocode;
                feature.properties.description = dataObj.city_geocode;
                feature.properties.arrests = dataObj.arrests;
                feature.properties.location_type = "city";
                feature.properties["marker-color"] = "#1B9CFA";
                feature.properties["marker-size"] = "medium";
                feature.geometry = {};
                feature.geometry.type = "Point";
                feature.geometry.coordinates = [];
                feature.geometry.coordinates[0] = dataObj.longitude;
                feature.geometry.coordinates[1] = dataObj.latitude;
                geoJson.features.push(feature);
            });

            var myLayer = L.mapbox.featureLayer().addTo(map);

// Add the iframe in a marker tooltip using the custom feature properties
            myLayer.on('layeradd', function (e) {
                var marker = e.layer,
                    feature = marker.feature;

                // Create custom popup content from the GeoJSON property 'video'
                var popupContent = "";
                _.each(feature.properties.arrests, function(arrest) {
                    var arrestHTML = templates["mapPopup.html"](arrest);
                    popupContent += arrestHTML;
                });

                //set icon
                if (feature.properties.icon !== undefined) {
                    marker.setIcon(L.icon(feature.properties.icon));
                }

                var popupWidth = 320;

                if (config.isMobile) {
                    popupWidth = 290;
                }

                // bind the popup to the marker http://leafletjs.com/reference.html#popup
                
                marker.addEventListener("click", app.handleClick);
                marker.bindPopup(feature.properties.title);
            });

// Add features to the map
            myLayer.setGeoJSON(geoJson);
        };

        app.handleClick = function(e) {
            var props = e.target.feature.properties;
            var entry = _.findWhere(app.objData.cities, {"city_geocode": props.title});
            $detailPanel.html(templates["details.html"](entry));

            $detailPanel.addClass("iapp-show");
            $('.iapp-main-panel').addClass('iapp-slide');
            $('.iapp-detail-close-button').click(function() {
                app.closeDetails();
            });

        };

        app.closeDetails = function() {
            $detailPanel.removeClass("iapp-show");
            $('.iapp-main-panel').removeClass('iapp-slide');
        };

        app.createShare = function(shareString) {
            var shareURL = window.location.href;
            var fbShareURL = encodeURI(shareURL.replace('#', '%23'));
            var twitterShareURL = encodeURIComponent(shareURL);
            var emailLink = "mailto:?body=" + encodeURIComponent(shareString) +  "%0d%0d" + twitterShareURL + "&subject=";
            
            return {
                'fb_id': config.facebook.app_id,
                fbShare:  encodeURI(shareURL.replace('#', '%23')),
                stillimage: "http://www.gannett-cdn.com/experiments/usatoday/2015/05/isil-arrests/img/fb-post.jpg",
                encodedShare: encodeURIComponent(shareString),
                fb_redirect: 'http://' + window.location.hostname + '/pages/interactives/fb-share/',
                email_link: "mailto:?body=" + encodeURIComponent(shareString) +  "%0d%0d" + encodeURIComponent(shareURL) + "&subject=",
                twitterShare: encodeURIComponent(shareURL)
            };

        };

        app.socialClick = function(e) {
            e.preventDefault();
            Analytics.trackEvent('Share button clicked: ' + jQuery(e.currentTarget).attr('id'));

            app.windowPopup(e.currentTarget.href, 500, 300);
        };

        app.windowPopup = function(url, width, height) {
            // Calculate the position of the popup so
            // it’s centered on the screen.
            var left = (screen.width / 2) - (width / 2),
            top = (screen.height / 2) - (height / 2);

            window.open(
                url,
                "",
                "menubar=no,toolbar=no,resizable=yes,scrollbars=yes,width=" + width + ",height=" + height + ",top=" + top + ",left=" + left
            );
        };

        return app;
    });
