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
            host: opts.zone === 'eu' ? 'listener-eu.logz.io' : 'listener.logz.io'
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
            obj['@timestamp'] = (new Date(obj.time)).toISOString();
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
            newline: (process.env.LOGZIO_NEWLINE === undefined) ? true : (process.env.LOGZIO_NEWLINE.toLowerCase() === 'true'),
            stats: (process.env.LOGZIO_STATS === undefined) ? true : (process.env.LOGZIO_STATS.toLowerCase() === 'true'),
            logs: (process.env.LOGZIO_LOGS === undefined) ? true : (process.env.LOGZIO_LOGS.toLowerCase() === 'true'),
            dockerEvents: (process.env.LOGZIO_DOCKER_EVENTS === undefined) ? true : (process.env.LOGZIO_DOCKER_EVENTS.toLowerCase() === 'true'),
            statsinterval: (process.env.LOGZIO_STATS_INTERVAL === undefined) ? 30 : parseInt(process.env.LOGZIO_STATS_INTERVAL),
            secure: (process.env.LOGZIO_SECURE === undefined) ? true : (process.env.LOGZIO_SECURE.toLowerCase() === 'true'),
            add: (process.env.LOGZIO_ADD === undefined) ? ['host=' + os.hostname()] : process.env.LOGZIO_ADD,
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
            '                         [--addLabels] [--labelsKey keyname] [--labelsMatch REGEXP]' +
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
