#! /usr/bin/env node

'use strict';

var through = require('through2');
var minimist = require('minimist');
var allContainers = require('docker-allcontainers');
var statsFactory = require('docker-stats');
var logFactory = require('docker-loghose');
var os = require('os');
var logzioLogger = require('logzio-nodejs');
var isJSON = require('is-json');
var eventsFactory = require('./docker-event-log');

var loggers = {};
function getOrCreateLogger(type, opts) {
    var logger = loggers[type];
    if (!logger) {
        var config = {
            token: opts.token,
            protocol: opts.secure ? 'https' : 'http',
            type: type,
            bufferSize: 1000,
            host: opts.zone === 'eu' ? 'listener-eu.logz.io' : '' // US is the default value
        }

        // Allow override to a specific logzio endpoint
        if (opts.endpoint) {
            config['host'] = opts.endpoint
        }
        console.log('Starting with config:')
        console.log(config)
        logger = logzioLogger.createLogger(config);
        loggers[type] = logger;
    }
    return logger;
}

function start(opts) {

    var filter = through.obj(function (obj, enc, cb) {
        addAll(opts.add, obj);

        var type = 'docker-unknown';
        if (obj.line) {
            obj.message = obj.line
            delete obj.line
            if (isJSON(obj.message)) {
              obj.logzio_codec = 'json';
            }
            else {
              obj.logzio_codec = 'plain';
            }
            type = 'docker_logs';
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
        string: ['token', 'endpoint'],
        alias: {
            'token': 't',
            'newline': 'n',
            'statsinterval': 'i',
            'add': 'a',
            'zone': 'z'
        },
        default: {
            newline: true,
            stats: true,
            logs: true,
            dockerEvents: true,
            statsinterval: 30,
            secure: true,
            add: ['host=' + os.hostname()],
            token: process.env.LOGZIO_TOKEN,
            zone: process.env.LOGZIO_ZONE
        }
    });

    if (argv.help || !(argv.token)) {
        console.log('Usage: docker-logzio [-t TOKEN] [--endpoint ENDPOINT]  [--no-newline]\n' +
            '                         [--no-stats] [--no-logs] [--no-secure] [--no-dockerEvents]\n' +
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
