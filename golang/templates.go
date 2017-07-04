package main

var index string = `<html>
    <h1>
        {{ .config.Title }}
    </h1>
    <h3>
    	{{ .config.Description }}
    </h3>
    {{ range $name, $gallery := .config.Galleries }}
    	<a href="/gallery/{{ $name }}">{{ $gallery.Description }}</a>
    {{ end }}
</html>`
