job "logzio" {

  datacenters = ["dc1"]


  type = "system"


  update {

    stagger = "10s"


    max_parallel = 1
  }


  group "cache" {

    count = 1


    restart {
      # The number of attempts to run the job within the specified interval.
      attempts = 10
      interval = "5m"

      # The "delay" parameter specifies the duration to wait before restarting
      # a task after it has failed.
      delay = "25s"


      mode = "delay"
    }


    ephemeral_disk {

      size = 300
    }


    task "logzio" {

      driver = "docker"

      config {
        image = "logzio/logzio-docker:v2.2"
        volumes = [
          # Use absolute paths to mount arbitrary paths on the host
          "/var/run/docker.sock:/var/run/docker.sock"
        ]
        tty = true
        labels {
          environment = "test"
        }

        args = [
        "-a", "env=TEST",
        ]

        dns_servers = ["172.17.0.1"]

      }

      env {
        "LOGZIO_TOKEN" = "<TOKEN_GOES_HERE>"
        "LOGZIO_ZONE"  = "us"
      }

      resources {
        cpu    = 500 # 500 MHz
        memory = 256 # 256MB
        network {
          mbits = 10
          port "http" {}
        }
      }

      service {
        name = "logzio"
        tags = ["global"]
        port = "http"
      }
    }
  }
}