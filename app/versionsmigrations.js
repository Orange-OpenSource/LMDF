module.exports.runMigration = (previous) => { // previous, current
  // TODO : it's ugly, can we factoryse it ?
  if (previous < '3.0.z' && Number(previous.slice(4)) < 10) {
    // re-scan videostreams, by reseting "lastviewed" flag.
    app.properties.set('lastVideoStream', '');
    return app.properties.save();
  }

  return Promise.resolve();
};
