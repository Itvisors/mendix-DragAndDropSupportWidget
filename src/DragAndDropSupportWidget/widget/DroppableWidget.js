/*
    @author    : Marcel Groeneweg
    @copyright : ITvisors
    @license   : Apache 2
*/

require( [
    "dojo/_base/declare", "mxui/widget/_WidgetBase", "dojo/_base/lang",
    "DragAndDropSupportWidget/lib/jquery.ui.touch-punch"
], function (declare, _WidgetBase, lang, $) {
    "use strict";

    return declare("DragAndDropSupportWidget.widget.DroppableWidget", [ _WidgetBase ], {

        // Modeler parameters
        dropTargetClass: "",
        dropTargetHoverClass: "",
        dropTargetSelector: "",
        acceptSelector: "",
        dropTolerance: "",
        dropEntityList: [],// [ draggedEntity, onDropEntity, draggedReference, dropTargetReference, onDropMicroflow ]

        // Internal variables
        _contextObj: null,
        _dropData: null,
        _dropEntityItem: null,

        postCreate: function () {
            // console.log(this.id + '.postCreate');
            this._setupEvents();
        },

        update: function (obj, callback) {
            // console.log(this.id + '.update');
            this._contextObj = obj;

            callback();
        },

        _setupEvents: function () {
            var self = this;
            // http://api.jqueryui.com/droppable/
            var args = {
                accept: this.acceptSelector || "*",
                greedy: true,
                hoverClass: this.dropTargetHoverClass,
                tolerance: this.dropTolerance,
                drop: function (event, ui) {
                    self._drop(event, ui);
                }
            }
            var node;
            if (this.dropTargetSelector) {
                node = $(this.domNode).closest(this.dropTargetSelector);
            } else {
                node = $(this.domNode.parentElement);
            }
            node.addClass(this.dropTargetClass).droppable(args);
        },

        _drop: function (event, ui) {
            this._dropData = ui;

            var droppedObjectType = ui.draggable.attr("data-object-type");
            var droppedObjectGuid = ui.draggable.attr("data-object-guid");
            for (var index = 0; index < this.dropEntityList.length; index++) {
                if (droppedObjectType === this.dropEntityList[index].draggedEntity) {
                    this._dropEntityItem = this.dropEntityList[index];
                    console.log("Dropped " + droppedObjectType + ":" + droppedObjectGuid + " onto " + this._contextObj.getEntity() + ":" + this._contextObj.getGuid());
                    mx.data.create({
                        entity   : this._dropEntityItem.onDropEntity,
                        callback : lang.hitch(this, this.onDropObjectCreated),
                        error    : lang.hitch(this, this.onDropObjectCreateError)
                    });
                }
            }
        },

        /**
         * Called upon creation of onDropEntity
         *
         * @param mendixObject  The new Mendix object
         */
        onDropObjectCreated : function (mendixObject) {
            // console.log("onDropObjectCreated");

            var draggedReference = this._dropEntityItem.draggedReference.substr(0, this._dropEntityItem.draggedReference.indexOf("/"));
            var dropTargetReference = this._dropEntityItem.dropTargetReference.substr(0, this._dropEntityItem.dropTargetReference.indexOf("/"));
            var droppedObjectGuid = this._dropData.draggable.attr("data-object-guid");
            mendixObject.addReference(draggedReference, droppedObjectGuid);
            mendixObject.addReference(dropTargetReference, this._contextObj.getGuid());
            // console.log("Commit object");
            this.onDropMendixObject = mendixObject;
            mx.data.commit({
                mxobj    : mendixObject,
                callback : lang.hitch(this, this.onDropMendixObjectCommitted),
                error    : lang.hitch(this, this.onDropMendixObjectCommitError)
            });
        },

        /**
         * Called after object committed
         *
         */
        onDropMendixObjectCommitted : function () {
            // console.log("onDropMendixObjectCommitted");

            mx.data.action({
                params: {
                    applyto     : "selection",
                    actionname  : this._dropEntityItem.onDropMicroflow,
                    guids : [this.onDropMendixObject.getGuid()]
                },
                callback     : lang.hitch(this, this.onDropMicroflowCallback),
                error        : lang.hitch(this, this.onDropMicroflowError),
                onValidation : lang.hitch(this, this.onDropMicroflowError)
            });
            if (this._dropData.draggable.draggable("option", "helper") === "original") {
                // When the original item is dragged, it must be returned to its original position.
                // Mendix does not recreate widgets when refreshing lists but just updates existing widgets where possible and creates new ones when necessary.
                this._dropData.draggable.css({top: "0px", left: "0px"});
            }
        },

        /**
         * Call to onDrop microflow completed
         *
         */
        onDropMicroflowCallback : function () {
            this._moveDraggedNodeBack();
        },

        /**
         * Called after creation of onDropEntity failed
         *
         * @param err       The error object, if any
         */
        onDropObjectCreateError : function (err) {
            console.dir(err);
            console.log("Create object of entity " + this.onDropEntity + " ended with an error");
        },

        /**
         * Called after commit of onDropEntity failed
         *
         * @param err       The error object, if any
         */
        onDropMendixObjectCommitError : function (err) {
            console.dir(err);
            console.log("Commit object of entity " + this.onDropEntity + " ended with an error");
        },

        /**
         * Call to onDrop microflow failed
         *
         * @param err       The error object, if any
         */
        onDropMicroflowError : function (err) {
            this._moveDraggedNodeBack();
            console.dir(err);
            console.log("Call to microflow " + this.onDropMicroflow + " ended with an error");
        },

        _moveDraggedNodeBack: function () {
            if (this._dropData.draggable.draggable("option", "helper") === "original") {
                // When the original item is dragged, it must be returned to its original position.
                // Mendix does not recreate widgets when refreshing lists but just updates existing widgets where possible and creates new ones when necessary.
                this._dropData.draggable.css({top: "0px", left: "0px"});
            }
        },
    });
});
