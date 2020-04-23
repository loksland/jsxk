const jsxk = require('../jsxk');

if (true){
  
  jsxk.exec('test.jsx', {MESSAGE:'Promise'}).then(function(data){
    console.log('Success');
    console.log(data)
  }).catch(function(err){
    console.log('Fail');
    console.error(err);
  });

} else {
  
  jsxk.exec('test.jsx', {MESSAGE:'Callback'}, function(err, data){
    
    if (err){
      throw err;
    }
    
    console.log('Callback  C O M P L E T E. Success.');
    console.log(data);
    
  });
  
}
