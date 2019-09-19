/*
 * Copyright (C) 2018 - 2019 Orange
 * 
 * This software is distributed under the terms and conditions of the 'MIT'
 * license which can be found in the file 'LICENSE.txt' in this package distribution 
 * or at https://spdx.org/licenses/MIT
 *
 */

 /* Orange contributed module for use on CozyCloud platform
 * 
 * Module name: LMDMF - La musique de mes films
 * Version:     3.0.13
 * Created:     2018 by Orange
 */


module.exports.runMigration = (previous) => { // previous, current
  // TODO : it's ugly, can we factoryse it ?
  if (previous < '3.0.z' && Number(previous.slice(4)) < 12) {
    // re-scan videostreams, by reseting "lastviewed" flag.
    app.properties.set('lastVideoStream', '');
    return app.properties.save();
  }

  return Promise.resolve();
};
