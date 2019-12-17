VERSION=1.0.0
docker build -t docker.io/mitct02/wrek_playlist:$VERSION .
docker push docker.io/mitct02/wrek_playlist:$VERSION
