./build.sh
kubectl delete -f wrek_playlist.yaml
kubectl delete -f wrek_playlist_hd2.yaml
kubectl apply -f wrek_playlist.yaml
kubectl apply -f wrek_playlist_hd2.yaml

