/*
 * This file was copied and modified from https://github.com/pelger/docker-event-log
 * This repository seems to be idle and not maintained since it was released and request for a bug fix and pull request
 * were not attended.
 */

'use strict';

var nes = require('never-ending-stream');
var Docker = require('dockerode');
var through = require('through2');



var toEmit = function toEmit(data, container) {
    var exec = '';
    var name = '';

    if (container.Path && container.Args && container.Args.join) {
        exec = container.Path + ' ' + container.Args.join(' ');
    }

    if (container.Name && container.Name.replace) {
        name = container.Name.replace(/^\//, '');
    }

    return {
        id: container.Id,
        type: data.status,
        image: container.Image,
        labels: container.Config.Labels,
        name: name,
        host: data.from,
        execute: exec
    };
};



module.exports = function dockerEvents(opts) {
    opts = opts || {};
    var docker = new Docker(opts.docker);
    var result = through.obj();
    var oldDestroy = result.destroy;
    var events;

    result.setMaxListeners(0);

    result.destroy = function() {
        events.destroy();
        oldDestroy.call(this);
    };

    events = nes(function(cb) {
        if (docker.getEvents) {
            docker.getEvents(cb);
        }
    });

    var splitEvents = events.pipe(through.obj(function (chunk, enc, cb) {
        var _this = this;
        // the initial set of events arrives as one chunk
        var events = chunk.toString().split('\n');
        for (var i in events) {
            var event = events[i];
            if (event) {
               _this.push(event);
            }
        }
        cb()
    }));

    splitEvents.pipe(through.obj(function(chunk, enc, cb) {
        var _this = this;
        var data = JSON.parse(chunk);
        var container = docker.getContainer(data.id);
        container.inspect(function(err, containerData) {
            if (!err) {
                _this.push(toEmit(data, containerData));
            }
            cb();
        });
    })).pipe(result, {end: false});

    return result;
};