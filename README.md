# Introduction
LCVis (Light Curve Visualization) is a visualization tool for light curve analysis in astronomy.

# Run the demo
This project is just a website. Firstly, please clone the repo to your disk. Then download and unzip the light curve data [here](https://drive.google.com/file/d/0BwrNxLqCfaB5bE00SndqMjFJckk/view?usp=sharing) and put the `data_ogle/` folder in `./static`. 

Second, install the requirements. You can do so by 

    pip install -r requirements.txt
	
## Create the PCA files.

go into the `data_ogle` directory and run

    python ../../python_scripts/ogle_400K/pca.py V

This will create a `pca.json` file that you need in order to run the
demo.

## Start the webserver

Then go to the root directory of the repo and type `python
main.py`. If you're on OS X, please be aware of
[this ongoing issue with matplotlib](http://matplotlib.org/1.5.0/faq/virtualenv_faq.html). You'll
probably want to follow the instructions and run

    frameworkpython main.py
	
instead.

## Run the demo

Finally, open your browser and go to `http://localhost:8080` for periodic astro-objects.
(*Notice* it takes about 30 seconds to load the data)

For the animated tour demo, you'll need a browser that can render
WebGL. An up-to-date version of Google Chrome and a 5-year-old laptop
works, but running this on your cellphone is chancy.

