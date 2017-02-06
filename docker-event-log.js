/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
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

    events.pipe(through.obj(function(chunk, enc, cb) {
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