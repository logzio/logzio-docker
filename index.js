#! /usr/bin/env node

'use strict';

var through = require('through2');
var minimist = require('minimist');
var allContainers = require('docker-allcontainers');
var statsFactory = require('docker-stats');
var logFactory = require('docker-loghose');
var eventsFactory = require('docker-event-log');
var os = require('os');
var logzioLogger = require('logzio-nodejs');


var loggers = {};
function getOrCreateLogger(type, opts) {
    var logger = loggers[type];
    if (!logger) {
        logger = logzioLogger.createLogger({
            token: opts.token,
            protocol: 'https',
            type: type,
            bufferSize: 1000,
            host: opts.zone === 'eu' ? 'listener-eu.logz.io' : '' // US is the default value
        });
        loggers[type] = logger;
    }
    return logger;
}

function start(opts) {

    var filter = through.obj(function (obj, enc, cb) {
        addAll(opts.add, obj);

        var type = 'docker-unknown';
        if (obj.line) {
            type = 'docker-logs';
        }
        else if (obj.type) {
            obj.action_type = obj.type;
            type = 'docker-events';
        }
        else if (obj.stats) {
            type = 'docker-stats';
        }
        obj.host = os.hostname();

        getOrCreateLogger(type, opts).log(obj);

        cb()
    });

    var events = allContainers(opts);
    var loghose;
    var stats;
    var dockerEvents;

    opts.events = events;

    if (opts.logs !== false && opts.token) {
        loghose = logFactory(opts);
        loghose.pipe(filter);
    }

    if (opts.stats !== false && opts.token) {
        stats = statsFactory(opts);
        stats.pipe(filter);
    }

    if (opts.dockerEvents !== false && opts.token) {
        dockerEvents = eventsFactory(opts);
        dockerEvents.pipe(filter);
    }

    if (!stats && !loghose && !dockerEvents) {
        throw new Error('Please enable one logging facility out of stats, logs or dockerEvents');
    }


    return loghose;

    function addAll(proto, obj) {
        if (!proto) {
            return;
        }

        var key;
        for (key in proto) {
            if (proto.hasOwnProperty(key)) {
                obj[key] = proto[key];
            }
        }
    }
}

function cli() {
    var argv = minimist(process.argv.slice(2), {
        boolean: ['json'],
        string: ['token'],
        alias: {
            'token': 't',
            'newline': 'n',
            'json': 'j',
            'statsinterval': 'i',
            'add': 'a',
            'zone': 'z'
        },
        default: {
            json: false,
            newline: true,
            stats: true,
            logs: true,
            dockerEvents: true,
            statsinterval: 30,
            add: ['host=' + os.hostname()],
            token: process.env.LOGZIO_TOKEN,
            zone: process.env.LOGZIO_ZONE
        }
    });

    if (argv.help || !(argv.token)) {
        console.log('Usage: docker-logzio [-t TOKEN][-j] [--no-newline]\n' +
            '                         [--no-stats] [--no-logs] [--no-dockerEvents]\n' +
            '                         [-i STATSINTERVAL] [-a KEY=VALUE] [-z us|eu]\n' +
            '                         [--matchByImage REGEXP] [--matchByName REGEXP]\n' +
            '                         [--skipByImage REGEXP] [--skipByName REGEXP]\n' +
            '                         [--help]');

        process.exit(1);
    }


    if (argv.add && !Array.isArray(argv.add)) {
        argv.add = [argv.add];
    }

    argv.add = argv.add.reduce(function (acc, arg) {
        arg = arg.split('=');
        acc[arg[0]] = arg[1];
        return acc
    }, {});

    start(argv);
}

module.exports = start;

if (require.main === module) {
    cli();
}
