var express = require('express');
var app = express();

var moment = require('moment');
var bodyParser = require('body-parser');
var mongo = require('mongoose');
var cors = require('cors');
var Schema = mongo.Schema;
var moment = require('moment');
var multer = require('multer');
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname + '/public'));

//Socket IO

const server = require('http').createServer();
const io = require('socket.io')(server);

server.listen(5000, 'localhost');

//DATABASE

var db = mongo.createConnection("mongodb://localhost:27017/test", { useCreateIndex: true, useNewUrlParser: true , useUnifiedTopology: true});

//MONGOOSE

var CasoSchema = new Schema({
    caso: {type: String},
    cedula: {type: String},
    direccion: {type: String},
    nombre: {type: String},
    nota: {type: [Array]},
    fechaCreado: {type: Date},
    capital: {type: String},
    montoApoderado: {type: String},
    numeroCliente: {type: String},
    numeroProducto: {type: String},
    banco: {type: String}
});

var CounterSchema = new Schema({
    _id: {type: String, required: true},
    seq: { type: Number, default: 0}
});

var UsuarioSchema = new Schema({
    usuario: {type: String},
    contrasena: {type: String},
    nombre: {type: String},
    privilegio: {type: String},
    casos: {type: Array}
});

var CasosCompletados = new Schema({
    caso: {type: String},
    cedula: {type: String},
    direccion: {type: String},
    nombre: {type: String},
    nota: {type: [Array]},
    fechaCreado: {type: Date},
    capital: {type: String},
    montoApoderado: {type: String},
    numeroCliente: {type: String},
    numeroProducto: {type: String},
    banco: {type: String}
});

var completado = db.model('Completados', CasosCompletados, "completados");
var usuario = db.model('Usuario', UsuarioSchema, "usuarios");
var counter = db.model('counter', CounterSchema);
var model = db.model('Persona', CasoSchema);

async function incrementar() {
    let result = await counter.findByIdAndUpdate('incremento', {$inc: { seq: 1} }, {new: true});
    return result.seq
}

//REQUEST

app.get('/', function (req, res) {
    model.find(function (err, personas){
        if(err){
            console.log(err)
        }
        else{
            res.json(personas);
        }
    });
});

app.get('/usuario', function (req, res) {

    usuario.find(
        function (err, usuarios){
            if(err){
                console.log(err)
            }
            else{
                res.json(usuarios);
            }
        }
    )
});

app.get('/buscar-todos-casos/:caso', async function (req, res) {

    let enviado = false;

    await model.find(async function (err, personas){

        if(err){
            console.log(err);
        }
        else {
            for (const casos of personas) {
                if(casos.cedula === req.params.caso || casos.caso === req.params.caso || casos.nombre === req.params.caso) {
                    enviado = true;
                    return res.json({casos, asignado: 'sin asignar'});
                }
            }
        }
    });

    await completado.find(async function (err, completado) {
        if(err) {
            console.log(err);
        } else {
            for (const casos of completado) {
                if(casos.cedula === req.params.caso || casos.caso === req.params.caso) {
                    enviado = true;
                    return res.json({casos, asignado: 'completado'});
                }
            }                    

            }
    });

    await usuario.find(function(err, usuario) {
        if (err) {
            console.log(err);
        } else {
            for (const iterator of usuario) {
                for (const usuarioCaso of iterator.casos) {
                    if(usuarioCaso.cedula === req.params.caso || usuarioCaso.caso === req.params.caso) {
                        enviado = true;
                        return res.json({usuarioCaso, asignado: iterator.usuario});
                    }
                }
            }
        }
    });

    if(enviado === false) {
        io.emit('aviso', 'Este caso no aparece en la base de datos!');
    }
    return res.json('No');
});

app.get('/buscarUsuario/:value', function (req, res) {
    let value = req.params.value;
    usuario.find({ usuario: value}, function(err, doc) {
        if(err) {
          console.log(err);
        }else {
            if (doc.length !== 0){
                res.json(doc);
            }else {
                res.json('No');
            }
        }
    });
});

app.post('/agregar-nota', async function(req, res) {

    usuario.updateOne( 
        {usuario: req.body.user, 'casos._id': req.body.id },
        { $push: { 
            "casos.$.nota": [req.body.value, req.body.nombre, moment().format('MM DD YYYY'), req.body.fecha]
        } }, function(err) {
            if(err) {
                console.log(err);
            }
        });

    res.json('ok');

});

app.post('/agregar-nota-todos-casos', function(req, res) {

    if (req.body.asignado === 'sin asignar') {

        model.findByIdAndUpdate( 
            req.body.id,
            { $push: { 
            nota: [req.body.value, req.body.usuario, moment().format('MM DD YYYY'), req.body.fecha]
        } }, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                console.log(res);
            }
        });

    } else if (req.body.asignado === 'completado') {

        completado.findByIdAndUpdate( 
            req.body.id,
            { $push: { 
            nota: [req.body.value, req.body.usuario, moment().format('MM DD YYYY'), req.body.fecha]
        } }, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                console.log(res);
            }
        });

    } else {

        usuario.updateOne( 
            {usuario: req.body.asignado, 'casos._id': req.body.id },
            { $push: { 
                "casos.$.nota": [req.body.value, req.body.usuario, moment().format('MM DD YYYY'), req.body.fecha]
            } }, function(err) {
                if(err) {
                    console.log(err);
                }
            });
    }

    res.json('ok');

});

app.post('/agregar-casos-completados', async function(req, res) {

    if(req.body.borrar === 'Sin asignar') {
        for (const iterator of req.body.casos) {
            var casoCompletado = new completado(iterator);
            await casoCompletado.save(iterator);
            await model.deleteOne({cedula: iterator.cedula}, (err) => {
                if (err) err;
            });
        }
    } else {
        for (const iterator of req.body.casos) {
            var casoCompletado = new completado(iterator);
            await casoCompletado.save(iterator, (err) => {
                if(err) {
                    console.log(err);
                }
            });
        }
            await usuario.updateOne({usuario: req.body.borrar}, { $pullAll: {casos: req.body.casos}}, function (err) {
                if (err) {
                    console.log(err);
                }else {
                    res.json({value: 'ok'});
                }
            });
    }

    res.json({ ok: true });
});

app.post("/agregarCasos", async function(req, res){

    for (const iterator of req.body.list) {
        await usuario.updateOne({usuario: req.body.user},
            { $push: {casos: iterator}}, {useFindAndModify: false});
        await model.deleteOne({cedula: iterator.cedula});
    }

    res.json({ ok: true });
});

app.post('/verificar-usuario', function(req, res) {

        usuario.findOne({usuario: req.body.usuario}, function(err, usuario){
            if(err) {
              console.log(err);
            } else {
                if(usuario) {
                                if(usuario.contrasena === req.body.contrasena) {
                                    res.json({value: 'Correcto'});
                                }else{
                                    res.json({value: 'Incorrecto'});
                                }

                }else {
                    res.json({value: 'Incorrecto'});
            }
        }
        });

});

app.get('/casos-completados', function (req, res) {

    completado.find(
        function (err, usuarios){
            if(err){
                console.log(err)
            }
            else{
                res.json(usuarios);
            }
        }
    )
});

app.get('/usuario-especifico/:value', function (req, res) {

    let value = req.params.value;
    usuario.findOne({usuario: value}, function (err, doc) {
        if (err) {
            console.log(err);
            res.json({value: 'No encontrado'});
        } else {
            res.json(doc);
        } 
    });

});

app.post('/agregarSinAsignar', async function(req, res) {
    
    for (const iterator of req.body) {
        var user = new model(iterator);
        await user.save(iterator);
    }

    res.json({ ok: true });
});

app.get('/editar/:id', function (req, res) {
    let id = req.params.id;
    model.findById(id, function (err, persona){
        if(err) {
            console.log(err)
        }else{
            res.json(persona);
        }
    });
});

app.post('/actualizar-usuario/:id', function (req, res) {

    usuario.findByIdAndUpdate(req.params.id, 
        {
            nombre: req.body.nombre, 
            usuario: req.body.usuario, 
            contrasena: req.body.contrasena, 
            privilegio: req.body.privilegio
        }, 
        function (err, res){
        if(err) {
            console.log(err);
        } else {
            console.log(res);
        }
    });
});

app.post('/actualizar-caso-usuario/:id', function (req, res) {
    let id = req.params.id;

            usuario.updateOne( 
                {usuario: req.body.usuario, 'casos._id': id },
                { $set: { 
                    "casos.$.direccion": req.body.direccion,
                    "casos.$.nombre": req.body.nombre,
                    "casos.$.cedula": req.body.cedula,
                    "casos.$.capital": req.body.capital,
                    "casos.$.montoApoderado": req.body.montoApoderado
                } }, function(err, caso) {
                    if(err) {
                        console.log(err);
                    }
                });
    
    res.json({value: 'ok'});
});

app.post('/actualizar-caso', async function (req, res) {

    if (req.body.asignado === 'sin asignar') {

        model.findByIdAndUpdate(req.body.caso.id, 
            {
                nombre: req.body.caso.nombre,
                direccion: req.body.caso.direccion, 
                capital: req.body.caso.capital,
                montoApoderado: req.body.caso.montoApoderado
            }, 
            function (err, res){
            if(err) {
                console.log(err);
            } else {
                console.log(res);
            }
        });

    } else if (req.body.asignado === 'completado') {

        completado.findByIdAndUpdate(req.body.caso.id, 
            {
                nombre: req.body.caso.nombre,
                direccion: req.body.caso.direccion, 
                capital: req.body.caso.capital,
                montoApoderado: req.body.caso.montoApoderado
            }, 
            function (err, res){
            if(err) {
                console.log(err);
            } else {
                console.log(res);
            }
        });

    } else {

        await usuario.updateOne( 
            {usuario: req.body.caso.usuario, 'casos._id': req.body.caso.id },
            { $set: {
                "casos.$.direccion": req.body.caso.direccion,
                "casos.$.nombre": req.body.caso.nombre,
                "casos.$.capital": req.body.caso.capital,
                "casos.$.montoApoderado": req.body.caso.montoApoderado
            } }, function(err, caso) {
                if(err) {
                    console.log(err);
                } else {
                    console.log(caso);
                }
            });
    }

    res.json({value: 'ok'});
});

app.post('/actualizar/:id', function (req, res) {
    model.findById(req.params.id, function(err, persona){
        if(err) {
            console.log(err);
        }
        if(!persona){
            res.status(404).send("Datos no encontrados");
        }
        else{

            persona.cedula = req.body.cedula;
            persona.direccion = req.body.direccion;
            persona.nombre = req.body.nombre;

            persona.save().then(persona => {
                console.log("Los datos fueron actualizados");
            })
            .catch(err => {
                console.log("No se actualizaron los datos");
            });
        }
    });
});

app.post("/crearUsuario", function(req, res) {

    var user = new usuario(req.body);
    user.save();
    res.json({ ok: true });
});

app.post("/guardarUsuario", function(req, res){

    model.find({cedula: req.body.cedula}, async function (err, cedula){
        if(err){
            console.log(err);
        }else{
            if(cedula.length === 0){

                let caso = {};
                let today = moment().format('YYYY M D');
                var aumentoCaso = await incrementar();

                caso.cedula = req.body.cedula;
                caso.direccion = req.body.direccion;
                caso.nombre = req.body.nombre;
                caso.capital = req.body.capital;
                caso.caso = aumentoCaso;
                caso.montoApoderado = req.body.montoApoderado;
                caso.numeroCliente = req.body.numeroCliente;
                caso.numeroProducto = req.body.numeroProducto;
                caso.fechaCreado = today;
                
                var mod = new model(caso);

                await mod.save(caso);

            }else{
                console.log("Ya este documento existe en la base de datos");
            }
        }
    });
    res.json({ ok: true });
});

app.get("/borrarcaso/:id", function(req, res){
    model.findByIdAndRemove({ _id: req.params.id }, function(err) {
        if(err){
            console.log(err);
        }else{
            res.send({data:"El usuario ha sido eliminado"});
        }
    });
});

app.get("/borrarUsuario/:id", function(req, res){
    usuario.findByIdAndRemove({ _id: req.params.id }, function(err) {
        if(err){
            console.log(err);
        }else{
            res.json("Done");
        }
    });
});

app.post('/usuario-borrar/:usuario', async function (req, res) {

    if(req.params.usuario === 'Completado') {

        for (const iterator of req.body) {
            await completado.deleteOne({cedula: iterator.cedula}, (err) => {
                if (err) err;
            });
        }

    } else {
        usuario.updateOne({usuario: req.params.usuario}, { $pullAll: {casos: req.body}}, function (err, raw) {
            if (err) {
                console.log(err);
            }else {
                res.json({value: 'ok'});
            }
        });
    }


});

//EXCEL TO JSON

var storage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, './uploads/')
    },
    filename: function (req, file, cb){
        var datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    }
});

var upload = multer({
    storage: storage,
    fileFilter : function(req, file, callback) {
        if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length-1]) === -1) {
            return callback(new Error('Wrong extension type'));
        }
        callback(null, true);
    }
}).single('file');

app.post('/upload', function(req, res){
    var exceltojson;
    upload(req, res, function(err){
        if (err) {
            res.json({error_code:1,err_desc:err});
            return;
        }
        if(!req.file){
            res.json({error_code:1, err_desc:"No file passed"});
            return;
        }

        if(req.file.originalname.split('.')[req.file.originalname.split('.').length-1] === 'xlsx'){
            exceltojson = xlsxtojson;
        } else {
            exceltojson = xlstojson;
        }
        try {
            exceltojson({
                input: req.file.path,
                output: "./outPutJSON/output.json",
                lowerCaseHeaders: true
            }, function(err, result){
                if(err){
                    return res.json({error_code:1, err_desc:err, data: null});
                }
                res.json({datos:"Los datos fueron agregados exitosamente"});

                fs.readFile("./outPutJSON/output.json", 'utf8', async (err, fileContents) => {
                    if (err) {
                      console.error(err);
                      return;
                    }
                    try {
                      let data = JSON.parse(fileContents);
                      io.emit('test event', 'Se han subido ' + data.length + ' casos' );

                      for(let cantidad = 0; cantidad < data.length; cantidad++){
                        var documento = data[cantidad];
                        if(documento.nombre === '' || documento.cedula === '' || documento.direccion === '') {
                            console.log('No se puede guardar este documento');
                        } else {
                            var mostrar = await incrementar();
                            documento.caso = mostrar;
                            documento.montoApoderado = data[cantidad]['monto apoderado'];
                            documento.numeroCliente = data[cantidad]['no.cliente'];
                            documento.numeroProducto = data[cantidad]['no.producto'];
                            let today = moment().format('YYYY M D');
                            documento.fechaCreado = today;
                            documento.banco = req.body.banco;
                            var mod = new model(documento);
                            await mod.save(documento);
                        }
                      }
                    } catch(err) {
                      console.error(err);
                    }
                  })
                  
                });

                var fs = require('fs');
                try {
                    fs.unlinkSync(req.file.path)
                }catch(e){

                }
        } catch (e) {
            res.json({error_code:1, err_desc:"Corrupted excel file"});
        }
    });
});

//DATABASE

app.get('/archivo', function(req, res){
    res.sendFile(__dirname + "/index.html")
});

//SERVER

app.listen('3000', function(){
    console.log('running on 3000 port');
})