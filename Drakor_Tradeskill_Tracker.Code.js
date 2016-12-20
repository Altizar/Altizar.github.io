// ==UserScript==
// @name         Drakor TS Tracker
// @version      0.1.1
// @description  Tracks statistics of tradeskills
// @author       Altizar
// @match        http://*.drakor.com*
// ==/UserScript==
var Drakor_Tradeskill_Tracker = {
    target: document.getElementById('drakorWorld'),
    config: {
        attributes: true,
        childList: true,
        characterData: true
    },
    baseData: {
        catches: {
            "Nothing": 0
        },
        runs: 0,
        exp: 0
    },
    data: {},
    logText: function(text) {
        console.log(text);
    },
    observer: null,
    observer2: null,
    db: null,
    initDB: function() {
        Drakor_Tradeskill_Tracker.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
        IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

        request = window.indexedDB.open("Drakor_Tradeskill_Tracker", 5);
        request.onerror = function(event) {
            Drakor_Tradeskill_Tracker.db.createObjectStore("save", {
                keyPath: "id"
            });
        };
        request.onsuccess = function(event) {
            Drakor_Tradeskill_Tracker.db = event.target.result;
            Drakor_Tradeskill_Tracker.doWork();
        };
        request.onupgradeneeded = function(event) {
            var db = event.target.result;
            var objectStore = db.createObjectStore("save", {
                keyPath: "id"
            });
        };
        request.notfound = function(event) {
            console.log(event);
        };
    },
    save: function() {
        if (Drakor_Tradeskill_Tracker.db === null) {
            Drakor_Tradeskill_Tracker.logText('DB not loaded for saving');
            return false;
        }
        Drakor_Tradeskill_Tracker.db.transaction(["save"], "readwrite")
        .objectStore("save")
        .put({
            id: "00",
            data: Drakor_Tradeskill_Tracker.data
        });
    },
    load: function() {
        if (Drakor_Tradeskill_Tracker.db === null) {
            Drakor_Tradeskill_Tracker.logText('DB not loaded for loading');
            return false;
        }
        Drakor_Tradeskill_Tracker.logText('Loading');
        var objectStore = Drakor_Tradeskill_Tracker.db.transaction("save").objectStore("save");
        var request = objectStore.get("00");
        request.onsuccess = function(event) {
            if (request.result !== undefined) {
                Drakor_Tradeskill_Tracker.data = request.result.data;
            }
        };
        request.onerror = function(event) {
            console.log('Save Data Missing');
        };
    },
    parseData: function(data) {
        var type = jQuery('.skillResultsHeader').first().text().match(/Your (\w*) (History|Log)/)[1];
        var location = jQuery('.locationTitle').clone().children().remove().end().text();
        if (type === undefined  || location === undefined) {
            return false;
        }
        if (Drakor_Tradeskill_Tracker.data[type] === undefined) {
            Drakor_Tradeskill_Tracker.data[type] = {};
        }
        if (Drakor_Tradeskill_Tracker.data[type][location] === undefined) {
            Drakor_Tradeskill_Tracker.data[type][location] = JSON.parse(JSON.stringify(Drakor_Tradeskill_Tracker.baseData));
        }
        if (jQuery('.viewMat', data).length > 0) {
            var itemName = jQuery('.viewMat', data).first().text().replace('[', '').replace(']', '');
            if (Drakor_Tradeskill_Tracker.data[type][location].catches[itemName] === undefined) {
                Drakor_Tradeskill_Tracker.data[type][location].catches[itemName] = 0;
            }
            Drakor_Tradeskill_Tracker.data[type][location].catches[itemName]++;
        } else {
          var nodeText = jQuery(data).text();
          if (nodeText.match(/You (\w*) nothing/) === null && nodeText.match(/You didn't (\w*) anything/) === null) {
            return false;
          } else {
            Drakor_Tradeskill_Tracker.data[type][location].catches.Nothing++;
          }
        }
        var exp = parseInt(jQuery('.statValue', data).text());
        Drakor_Tradeskill_Tracker.data[type][location].runs += 1;
        Drakor_Tradeskill_Tracker.data[type][location].exp += exp;
        Drakor_Tradeskill_Tracker.save();
        Drakor_Tradeskill_Tracker.buildTable(type, location);
    },
    buildTable: function(type, location) {
        if (type === undefined) {
            Drakor_Tradeskill_Tracker.drawTable();
            return false;
        }
        if (Drakor_Tradeskill_Tracker.data[type] === undefined) {
            Drakor_Tradeskill_Tracker.data[type] = {};
        }
        if (Drakor_Tradeskill_Tracker.data[type][location] === undefined) {
            Drakor_Tradeskill_Tracker.data[type][location] = JSON.parse(JSON.stringify(Drakor_Tradeskill_Tracker.baseData));
        }
        Drakor_Tradeskill_Tracker.drawTable(type);
        var table = '';
        for (var key in Drakor_Tradeskill_Tracker.data[type][location].catches) {
            var found = Drakor_Tradeskill_Tracker.data[type][location].catches[key];
            var percent = parseInt(found / Drakor_Tradeskill_Tracker.data[type][location].runs * 100);
            table += '<tr><td>' + key + '</td><td>' + found + '</td><td>' + percent + '<td></tr>';
        }
        table += '<tr><th>Runs</th><td colspan="2">' + Drakor_Tradeskill_Tracker.data[type][location].runs + '</td></tr>';
        table += '<tr><th>Exp</th><td colspan="2">' + Drakor_Tradeskill_Tracker.data[type][location].exp + '</td></tr>';
        table += '<tr><th>Exp Avg</th><td colspan="2">' + parseInt(Drakor_Tradeskill_Tracker.data[type][location].exp / Drakor_Tradeskill_Tracker.data[type][location].runs) + '</td></tr>';
        jQuery('#fishingtrackerlist').empty().append(table);
        jQuery('#fishingtrackertype').text(type);
    },
    drawTable: function(type) {
        var target = document.getElementById('fishingtracker');
        if (target === null) {
            jQuery('#drakorWorld').append('<div id="fishingtracker" style="position: absolute;width: 200px;top: 0px;left: -235px" class="dContainer"><h3>Tracking <span id="fishingtrackertype">Unknown</span></h3><table><thead><tr><th>Item</th><th>Actions</th><th>Rate</th></tr></thead><tbody id="fishingtrackerlist"></tbody></table></div>');
        }
        jQuery('#fishingtrackertype').text(type);

    },
    run: function() {
        // Drakor_Tradeskill_Tracker.logText('Fishing Tracker Loaded');
        Drakor_Tradeskill_Tracker.initDB();
    },
    doWork: function() {
        Drakor_Tradeskill_Tracker.load();
        Drakor_Tradeskill_Tracker.observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0) {
                    var target = document.getElementById('skillResults');
                    if (target !== null) {
                        Drakor_Tradeskill_Tracker.buildTable();
                        Drakor_Tradeskill_Tracker.observer2.observe(target, Drakor_Tradeskill_Tracker.config);
                    }
                }
            });
        });
        Drakor_Tradeskill_Tracker.observer2 = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0) {
                    Drakor_Tradeskill_Tracker.parseData(mutation.addedNodes[1]);
                }
            });
        });
        Drakor_Tradeskill_Tracker.observer.observe(Drakor_Tradeskill_Tracker.target, Drakor_Tradeskill_Tracker.config);
        jQuery('#skillResults .roundResult').each(function() {
            Drakor_Tradeskill_Tracker.parseData(this);
        });
    }
};
Drakor_Tradeskill_Tracker.run();
if (unsafeWindow.Drakor_Tradeskill_Tracker === undefined) {
    unsafeWindow.Drakor_Tradeskill_Tracker = Drakor_Tradeskill_Tracker;
}