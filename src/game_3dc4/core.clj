(ns game-3dc4.core
  (:gen-class)
  (:use compojure.core
        ring.adapter.jetty
        ring.middleware.file-info
        ring.middleware.file)
  (:require [compojure.route :as route]))

(defroutes main-routes
  ; (GET "/" [] "<h1>Hello World</h1>")
  (route/not-found "<h1>Page not found</h1>"))

(def app
  (-> main-routes
    wrap-file-info
    (wrap-file "public")))

(defn -main []
  (future (run-jetty (var app) {:port 8080})))
