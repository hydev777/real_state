const Property = require("../models/property");
const User = require("../models/user");

var multer = require("multer");
const formidable = require("formidable");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../config/keys");
const dotenv = require('dotenv');
dotenv.config();

const validateRegisterInput = require("../validation/register");
const validateLoginInput = require("../validation/login");

exports.test = function (req, res) {
  res.send("Hello World!");
};

exports.properties = async function (req, res) {
  try {
    const properties = await Property.find({});

    res.json(properties);
  } catch (e) {
    console.log(e);
  }
};

exports.oneProperty = async function (req, res) {
  try {
    await Property.findById(req.params.id, (err, property) => {
      if (err) {
        console.log(err);
      }

      res.json(property);
    });
  } catch (e) {
    console.log(e);
  }
};

exports.createProperty = async (req, res) => {

  let images = [];

  for (let photo = 0; photo < req.files.length; photo++) {
    images.push({
      id: req.files[photo].filename,
      name: req.files[photo].originalname,
    });
    console.log(req.files[photo]);
  }

  try {
    const property = new Property({
      title: req.body.title,
      images: [...images],
      description: req.body.description,
      bedrooms: req.body.bedrooms,
      bathrooms: req.body.bathrooms,
      availability: req.body.availability,
      created_at: Date.now(),
      rate_day: req.body.day,
      rate_week: req.body.week,
      rate_month: req.body.month,
    });

    await property.save();

    res.status(200).send();
  } catch (e) {
    console.log(e);

    res.status(400).send(e);
  }
};

exports.uploadImage = async (req, res) => {
  let image;

  image = { name: req.file.originalname, id: req.file.filename };

  await Property.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        images: image,
      },
    },
    (err, property) => {
      if (err) {
        console.log(err);
      }

      if (property) {
        res.status(200).send("La imagen ha sido agregada!");
      }
    }
  );
};

exports.deleteImage = async (req, res) => {
  await Property.findByIdAndUpdate(
    req.params.id,
    {
      $pull: {
        images: { id: req.body.id },
      },
    },
    (err, property) => {
      if (err) {
        console.log(err);
      }

      if (property) {
        res.status(200).send("La imagen ha sido eliminada!!");
      }
    }
  );
};

exports.makeReservation = async (req, res) => {
  try {
    await Property.findByIdAndUpdate(
      req.body.propertyId,
      {
        $push: {
          reservations: {
            date_range: [req.body.dateStart, req.body.dateEnd],
            name: req.body.fullName,
            phone: req.body.telephone,
            email: req.body.email,
            reservation_type: req.body.typeReservation,
            active: false,
            date_made: Date.now(),
          },
        },
      },
      (err, property) => {
        if (err) {
          console.log(err);
        }

        if (property) {
          res.status(200).send("Success");
        }
      }
    );
  } catch (e) {
    console.log(e);
  }
};

exports.setReservation = async (req, res) => {
  try {
    // let availability = await model.Property.find({ availability: "no disponible" });

    let availability = await Property.find({
      _id: req.params.propertyId,
    });

    if (availability[0].availability == "no disponible") {
      res.json({ message: "Ya existe una reservacion disponible" });
    } else {
      await Property.updateOne(
        {
          _id: req.params.propertyId,
          "reservations._id": req.params.reservationId,
        },
        {
          $set: {
            "reservations.$.active": true,
            availability: "no disponible",
          },
        },
        (err, property) => {
          if (err) {
            console.log(err);
          }

          if (property) {
            res
              .status(200)
              .send({ message: "La reservacion fue establecida con exito" });
          }
        }
      );
    }
  } catch (e) {
    console.log(e);
  }
};

exports.deactivateReservation = async (req, res) => {
  try {
    await Property.updateOne(
      {
        _id: req.params.propertyId,
        "reservations._id": req.params.reservationId,
      },
      {
        $set: {
          "reservations.$.active": false,
          availability: "disponible",
        },
      },
      (err, property) => {
        if (err) {
          console.log(err);
        }

        if (property) {
          res.json({ message: "Reservacion desactivada" });
        }
      }
    );
  } catch (e) {
    console.log(e);
  }
};

exports.editProperty = async function (req, res) {
  await Property.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        title: req.body.title,
        description: req.body.description,
        bedrooms: req.body.bedrooms,
        bathrooms: req.body.bathrooms,
        availability: req.body.availability,
        rate_day: req.body.day,
        rate_week: req.body.week,
        rate_month: req.body.month,
      },
    },
    (err, property) => {
      if (err) {
        console.log(err);
      }

      if (property) {
        res.status(200).send("La propiedad ha sido actualizada!");
      }
    }
  );
};

exports.editSearch = async function (req, res) {
  try {
    let properties = await Property.find({
      $text: { $search: req.body.criteria },
    });

    if (properties != []) {
      res.json(properties);
    }

    if (properties == []) {
      res.json({ message: "No se encontro esta propiedad!" });
    }
  } catch (e) {
    console.log(e);
  }
};

exports.register = async function (req, res) {
  const { errors, isValid } = validateRegisterInput(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }).then((user) => {

    console.log(user)

    if (user) {
      return res.status(400).json({ email: "Email already exists" });
    } else {
      const newUser = new User({
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then((user) => res.json(user))
            .catch((err) => console.log(err));
        });
      });
    }
  });
};

exports.login = async function (req, res) {
  const { errors, isValid } = validateLoginInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  // Find user by email
  User.findOne({ email }).then((user) => {
    // Check if user exists
    if (!user) {
      return res.status(404).json({ emailnotfound: "Email not found" });
    }
    // Check password
    bcrypt.compare(password, user.password).then((isMatch) => {
      if (isMatch) {
        // User matched
        // Create JWT Payload
        const payload = {
          id: user.id,
          name: user.name,
        };
        // Sign token
        jwt.sign(
          payload,
          keys.secretOrKey,
          // process.env.TOKEN_SECRET,
          {
            expiresIn: "2 day",
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token,
            });
          }
        );
      } else {
        return res
          .status(400)
          .json({ passwordincorrect: "Password incorrect" });
      }
    });
  });
};

// exports.deleteImage = async (req, res) => {
//   try {
//     const propertyImage = await propertySchema.findById(req.body.id);
//     propertyImage.image = undefined;
//     propertyImage.save();
//     res.send();
//   } catch (e) {
//     res.status(400).send(e);
//   }
// };

// exports.getImage = async (req, res) => {
//   try {
//     const propertyImage = await propertySchema.findById(req.params.id);

//     if (!propertyImage || !propertyImage.image) {
//       throw new Error();
//     }

//     res.set("Content-Type", "image/png");
//     res.send(propertyImage.image);
//   } catch (e) {
//     res.status(400).send(e);
//   }
// };

// exports.deleteProperty = function (req, res) {
//   console.log(req.params.id);
//   res.send("deleteProperty");
// };

// exports.login = function (req, res) {
//   console.log(req.body);
//   res.send("login");
// };

// exports.logout = function (req, res) {
//   res.send("logout");
// };

// exports.user = function (req, res) {
//   res.send("user");

//   // Model.find()
// };

// exports.userCreate = function (req, res) {
//   res.send("userCreate");
// };

// exports.userDelete = function (req, res) {
//   res.send("userDelete");
// };

// exports.userEdit = function (req, res) {
//   res.send("userEdit");
// };
