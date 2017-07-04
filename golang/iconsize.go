package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"html/template"
	"image"
	"image/png"
	"log"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/gin-gonic/gin"
)

var iconsNamesSizesDict = map[string]int{
	"iphone-29.png":       29,
	"iphone-40.png":       40,
	"iphone-50.png":       50,
	"iphone-57.png":       57,
	"iphone-60.png":       60,
	"iphone-72.png":       72,
	"iphone-76.png":       76,
	"iphone-29@2x.png":    58,
	"iphone-40@2x.png":    80,
	"iphone-50@2x.png":    100,
	"iphone-57@2x.png":    114,
	"iphone-60@2x.png":    120,
	"iphone-72@2x.png":    144,
	"iphone-76@2x.png":    152,
	"iphone-29@3x.png":    87,
	"iphone-40@3x.png":    120,
	"iphone-50@3x.png":    150,
	"iphone-57@3x.png":    171,
	"iphone-60@3x.png":    180,
	"iphone-72@3x.png":    216,
	"iphone-76@3x.png":    228,
	"android-ldpi.png":    36,
	"android-mdpi.png":    48,
	"android-hdpi.png":    72,
	"android-xhdpi.png":   96,
	"android-xxhdpi.png":  144,
	"android-xxxhdpi.png": 192,
}

type ResizeJob struct {
	im       *image.Image
	imConfig *image.Config
}

func main() {
	var err error

	r := gin.Default()

	t := template.New("index")
	if t, err = t.Parse(index); err != nil {
		log.Fatalln(err)
	}
	r.SetHTMLTemplate(t)

	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index", nil)
	})

	r.POST("/iconize", resizeUpload)

	r.Run() // listen and server on 0.0.0.0:8080
}

func resizeUpload(c *gin.Context) {
	file, header, err := c.Request.FormFile("image")
	filename := strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename))

	var imageBuf bytes.Buffer
	var zipOutput bytes.Buffer
	zipFile := zip.NewWriter(&zipOutput)
	n, err := imageBuf.ReadFrom(file)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, fmt.Errorf("Failed to read full size of %d bytes", n))
	}
	imageReader := bytes.NewReader(imageBuf.Bytes())

	imageData, _, _ := image.Decode(imageReader)
	imageReader.Seek(0, 0)
	imageConfig, _, _ := image.DecodeConfig(imageReader)

	for name, size := range iconsNamesSizesDict {
		icon := resizeImage(ResizeJob{
			im:       &imageData,
			imConfig: &imageConfig,
		}, size, size)

		imageFile, _ := zipFile.Create(fmt.Sprintf("%s-%s", filename, name))
		png.Encode(imageFile, icon)
	}
	zipFile.Close()

	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s.icon.zip", filename))
	c.Data(200, "application/zip, application/octet-stream", zipOutput.Bytes())
}

func calculateNewDimensions(origX, origY, maxX, maxY int) (newX int, newY int) {
	// Preserve aspect ratio
	if origX > maxX {
		newY = int(float64(origY) / float64(origX) * float64(maxX))
		if newY < 1 {
			newY = 1
		}
		newX = maxX
	}

	if newY > maxY {
		newX = int(float64(origX) / float64(origY) * float64(maxY))
		if newX < 1 {
			newX = 1
		}
		newY = maxY
	}

	return
}

func resizeImage(r ResizeJob, x, y int) *image.NRGBA {
	iconX, iconY := calculateNewDimensions(r.imConfig.Width, r.imConfig.Height, x, y)

	return imaging.Resize(*r.im, iconX, iconY, imaging.Lanczos)
}
