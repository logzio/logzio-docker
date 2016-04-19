# logzio-docker

Forward all your Docker logs to [Logz.io](http://logz.io)

![ELK Apps Docker dashboard](https://github.com/logzio/logzio-docker/blob/master/Docker-DashBoard.png)


## Usage as a Container

The simplest way to forward all your container's log to Logz.io is to
run this repository as a container, with:

```sh
docker run -v /var/run/docker.sock:/var/run/docker.sock logzio/docker-logzio -t <TOKEN> -j -a application=myapp
```

You can pass the `--no-stats` flag if you do not want stats to be
published to Logz.io every second. You __need this flag for Docker
version < 1.5__.

You can pass the `--no-logs` flag if you do not want logs to be published to Logz.io.

You can pass the `--no-dockerEvents` flag if you do not want events to be
published to Logz.io.

The `-i/--statsinterval <STATSINTERVAL>` downsamples the logs sent to Logentries. It collects samples and averages them before sending to Logz.io.

The `-a` allows to add more fields to the log - this can be used to tag spesific application, enviroment etc. 

You can also filter the containers for which the logs/stats are
forwarded with:

* `--matchByName REGEXP`: forward logs/stats only for the containers whose name matches the given REGEXP.
* `--matchByImage REGEXP`: forward logs/stats only for the containers whose image matches the given REGEXP.
* `--skipByName REGEXP`: do not forward logs/stats for the containers whose name matches the given REGEXP.
* `--skipByImage REGEXP`: do not forward logs/stats for the containers whose image matches the given REGEXP.

### Running container in a restricted environment.
Some environments(such as Google Compute Engine) does not allow to access the docker socket without special privileges. You will get EACCES(`Error: read EACCES`) error if you try to run the container.
To run the container in such environments add --privileged to the `docker run` command.

Example:
```sh
docker run --privileged -v /var/run/docker.sock:/var/run/docker.sock logzio/docker-logzio -t <TOKEN> -j -a application=myapp
```

## How it works

This container wraps four [Docker
APIs](https://docs.docker.com/reference/api/docker_remote_api_v1.17/):

* `POST /containers/{id}/attach`, to fetch the logs
* `GET /containers/{id}/stats`, to fetch the stats of the container
* `GET /containers/json`, to detect the containers that are running when
  this module starts
* `GET /events`, to detect new containers that will start after the
  module has started

This module wraps
[docker-loghose](https://github.com/mcollina/docker-loghose) and
[docker-stats](https://github.com/pelger/docker-stats) to fetch the logs
and the stats as a never ending stream of data.

## License

Apache2
