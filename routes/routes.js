var express = require('express');
var router = express.Router();
// var model = require('../models/models');
var multer = require('multer');
var controller = require('../services/services');
const passport = require("passport");

const upload = multer({ 
    dest: 'images',
    limits: {
        FileSize: 2000000
    },
    fileFilter(req, file, cb) {
        if(!file.originalname.match(/\.(png|jpg|jpeg)$/)) {

            cb(new Error('Please upload an image'));

        }

        cb(undefined, true);
    } 
});

// router.all()

// // Test route

// router.get('/', controller.test);

// //TODO: make reservation

router.post('/reservation', upload.none(), controller.makeReservation);

// //TODO: set one reservation to active

router.post('/properties/:propertyId/reservation/:reservationId', upload.none(), controller.setReservation);

// // deactivate reservation

router.post('/properties/:propertyId/reservation/:reservationId/deactivate', upload.none(), controller.deactivateReservation);

// //TODO: get all properties

router.get('/properties', controller.properties);

//TODO: create property

router.post('/properties/create', upload.array('upload', 4), controller.createProperty);

//TODO: upload image property

router.post('/properties/upload-image/:id', upload.single('upload'), controller.uploadImage);

//TODO: delete image property

router.post('/properties/delete-image/:id', upload.none(), controller.deleteImage);

// //TODO: edit property

router.post('/properties/edit/:id', upload.none(), controller.editProperty);

// //TODO: search property criteria

router.post('/properties/edit', upload.none(), controller.editSearch);

// //TODO: hide/delete property

// router.post('/properties/delete/:id', controller.deleteProperty);

// //TODO: get single property

router.get('/properties/:id', controller.oneProperty);

// //TODO: registration

router.post('/register', upload.none(), controller.register);

// //TODO: login

router.post('/login', upload.none(), controller.login);

// //TODO: logout

// router.get('/logout', controller.logout);

// //TODO: get user

// router.post('/user', controller.user);

// //TODO: create user

// router.post('/user/create', controller.userCreate);

// //TODO: delete user

// router.post('/user/delete/:id', controller.userDelete);

// //TODO: edit user

// router.post('/user/edit/:id', controller.userEdit);

module.exports = router;
