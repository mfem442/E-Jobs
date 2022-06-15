// server/index.js

const express = require("express");

const PORT = process.env.PORT || 3001;

const app = express();

var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Rojito02!"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  con.query("use `it-jobs`;");
});

app.use(express.json());
//app.use(express.urlencoded({extended: true}));

app.get("/persona/:clave-:correo",(req, res) => {
	con.query("SELECT * FROM persona WHERE correo = '"+ req.params.correo +"' AND contraseña = '"+req.params.clave+"';", function (err, result) {
		if (err) throw err;
		if(result.length > 0){
			con.query("CALL getKind("+result[0].idPersona+");", function(err2, result2){
				if (err2) throw err2;
				res.json({id: result[0].idPersona,name: result[0].nombre, lname: result[0].primerApellido, user: result2[0][0].kind});
			});
		} else res.json({id: null});
	});
});

//Crea un registro en la tabla de vacantes
app.post("/vacante", (req, res) => {
	con.query("SELECT idReclutador FROM reclutador WHERE persona="+req.body.id+";", function (err2, result2) {
		if(err2) throw err2;
		if(result2.length > 0){
			con.query("INSERT INTO vacante(nombre, descripcion,fechaLimite,fechaPublicacion, reclutador, requisitos) VALUES ('"+req.body.name+"','"+req.body.desc+"','"+req.body.expires+"',CURDATE(),"+result2[0].idReclutador+",'"+req.body.requirements+"')", function (err, result){
				if(err) throw err
				res.json({message: "Correct"});
			});
		} else res.json({message: "Error"});
	});
});

//Añade un solicitante, en la tabla personas y en la tabla solicitante
app.post("/solicitante", (req, res) => {
	con.query("INSERT INTO persona(nombre, primerApellido,segundoApellido,telefono, correo, sexo, contraseña) VALUES ('"+req.body.name+"','"+req.body.last1+"','"+req.body.last2+"','"+req.body.phone+"','"+req.body.email+"','"+req.body.sex+"','"+req.body.password+"')", function (err, result){
			if(err) throw err;
			con.query("SELECT idPersona FROM persona WHERE telefono="+req.body.phone+" AND correo='"+req.body.email+"';", function(err2, result2){
				if(err2) throw err2;
				con.query("INSERT INTO solicitante(persona, edoCivil, notificaciones) VALUES ("+result2[0].idPersona+",'"+req.body.state+"','"+req.body.notify+"');", function(err3, result3){
					if(err3) throw err3;
					res.json({message: "Correct"});
				});
			});
	});
});

//Obtiene las solicitudes realizadas por un solicitante en particular
app.get("/solicitud/persona/:id", (req, res) => {
	con.query("SELECT idSolicitud, nombre, nombreComercial, DATE_FORMAT(fecha, '%d/%b/%Y') AS fecha, estado, comentarios "+
						"FROM (((solicitud JOIN solicitante ON solicitud.solicitante = solicitante.idSolicitante) "+
							"JOIN vacante ON solicitud.vacante = vacante.idVacante) "+
							"JOIN reclutador ON vacante.reclutador = reclutador.idReclutador) "+
							"JOIN empresa ON reclutador.empresa = empresa.idEmpresa "+
						"WHERE solicitante.persona = "+req.params.id+";", function(err, result){
								if(err) throw err;
								res.json({content: result});
						});
});

//Obtiene las vacantes disponibles
app.get("/vacante", (req, res) => {
	con.query("SELECT idVacante, nombre, nombreComercial, DATE_FORMAT(fechaPublicacion, '%d/%b/%Y') AS fechaPublicacion, DATE_FORMAT(fechaLimite, '%d/%b/%Y') AS fechaLimite, descripcion, requisitos, nombreFiscal, pais, area "+
		"FROM (vacante JOIN reclutador ON vacante.reclutador = reclutador.idReclutador) "+
  	"JOIN empresa ON reclutador.empresa = empresa.idEmpresa "+
  	"WHERE fechaLimite > curdate();", function(err, result){
  		if(err) throw err;
  		res.json({content: result});
	});
});

app.post("/solicitud", (req, res) => {
	con.query("SELECT idSolicitante FROM solicitante WHERE persona="+req.body.id+";", function (err2, result2) {
		if(err2) throw err2;
		if(result2.length > 0){
		con.query("INSERT INTO solicitud(vacante, solicitante, fecha, estado) "+
			"VALUES ("+req.body.vacante+", "+result2[0].idSolicitante+",CURDATE(), 'Sin Revisar');", function(err, result) {
				if(err) throw err;
				res.json({message: "Correct"});
			});
		}
	});
});

//Endpoints relacionados a la experiencia académica
app.get("/expAcademica/persona/:id", (req, res) => {
	con.query("SELECT idExpAcademica, nombre,  DATE_FORMAT(fechaInicio, '%d/%b/%Y') AS fechaInicio, DATE_FORMAT(fechaFin, '%d/%b/%Y') AS fechaFin, institucion, comentarios "+
						"FROM expAcademica JOIN solicitante ON expAcademica.solicitante = solicitante.idSolicitante "+
						"WHERE solicitante.persona = "+req.params.id+";", function(err, result){
								if(err) throw err;
								res.json({content: result});
						});
});

app.delete("/expAcademica/:idExp", (req, res) => {
	con.query("DELETE FROM expAcademica WHERE idExpAcademica = "+req.params.idExp+";", function(err, result){
		if(err) throw err;
		res.json({message: "Correct"});
	});
});

app.post("/expAcademica/persona/:id", (req, res) => {
	con.query("SELECT idSolicitante FROM solicitante WHERE persona="+req.params.id+";", function (err2, result2){
		if(err2) throw err2;
		if(result2.length > 0){
			con.query("INSERT INTO expAcademica(nombre, fechaInicio, fechaFin, institucion, comentarios, solicitante) "+
					"VALUES ('"+req.body.name+"','"+req.body.startDate+"','"+req.body.endDate+"','"+req.body.institution+"','"+req.body.comments+"',"+result2[0].idSolicitante+");", function(err, result){
						if(err) throw err;
						res.json({message: "Correct"});
			});
		}
	});
});

//Endpoints relacionados a la experiencia laboral
app.get("/expLaboral/persona/:id", (req, res) => {
	con.query("SELECT idExpLaboral, lugarDeLabor, nombreDelPuesto,  DATE_FORMAT(fechaInicio, '%d/%b/%Y') AS fechaInicio, DATE_FORMAT(fechaFin, '%d/%b/%Y') AS fechaFin, actividadesRealizadas, comentarios "+
						"FROM expLaboral JOIN solicitante ON expLaboral.solicitante = solicitante.idSolicitante "+
						"WHERE solicitante.persona = "+req.params.id+";", function(err, result){
								if(err) throw err;
								res.json({content: result});
						});
});

app.delete("/expLaboral/:idExp", (req, res) => {
	con.query("DELETE FROM expLaboral WHERE idExpLaboral = "+req.params.idExp+";", function(err, result){
		if(err) throw err;
		res.json({message: "Correct"});
	});
});

app.post("/expLaboral/persona/:id", (req, res) => {
	con.query("SELECT idSolicitante FROM solicitante WHERE persona="+req.params.id+";", function (err2, result2){
		if(err2) throw err2;
		if(result2.length > 0){
			con.query("INSERT INTO expLaboral(lugarDeLabor, nombreDelPuesto,  fechaInicio, fechaFin, actividadesRealizadas, comentarios, solicitante) "+
					"VALUES ('"+req.body.lugarDeLabor+"','"+req.body.nombreDelPuesto+"','"+req.body.startDate+"','"+req.body.endDate+"','"+req.body.actividadesRealizadas+"','"+req.body.comments+"',"+result2[0].idSolicitante+");", function(err, result){
						if(err) throw err;
						res.json({message: "Correct"});
			});
		}
	});
});

//Endpoints relacionados a las habilidades
app.get("/skills/persona/:id", (req, res) => {
	con.query("SELECT idSkills, habilidad, nivelDeDominio "+
						"FROM skills JOIN solicitante ON skills.solicitante = solicitante.idSolicitante "+
						"WHERE solicitante.persona = "+req.params.id+";", function(err, result){
								if(err) throw err;
								res.json({content: result});
						});
});

app.delete("/skills/:idExp", (req, res) => {
	con.query("DELETE FROM skills WHERE idSkills = "+req.params.idExp+";", function(err, result){
		if(err) throw err;
		res.json({message: "Correct"});
	});
});

app.post("/skills/persona/:id", (req, res) => {
	con.query("SELECT idSolicitante FROM solicitante WHERE persona="+req.params.id+";", function (err2, result2){
		if(err2) throw err2;
		if(result2.length > 0){
			con.query("INSERT INTO skills(habilidad, nivelDeDominio, solicitante) "+
					"VALUES ('"+req.body.habilidad+"',"+req.body.nivelDeDominio+","+result2[0].idSolicitante+");", function(err, result){
						if(err) throw err;
						res.json({message: "Correct"});
			});
		}
	});
});

app.get("/vacante/persona/:id", (req, res) => {
	con.query("SELECT vacante.nombre, idVacante, DATE_FORMAT(fechaLimite, '%d/%b/%Y') AS fechaLimite "+
		"FROM vacante JOIN reclutador ON vacante.reclutador = reclutador.idReclutador "+
		"WHERE reclutador.persona = "+req.params.id+" ;", function(err, result){
			if(err) throw err;
			res.json({content: result});
		});
});

app.get("/solicitud/vacante/:id", (req, res) => {
	con.query("SELECT idSolicitud, solicitud.fecha, persona.nombre, persona.primerApellido, persona.segundoApellido, telefono, correo, idPersona "+
						"FROM (solicitud JOIN solicitante ON solicitante.idSolicitante = solicitud.solicitante) "+
						"	JOIN persona ON persona.idPersona = solicitante.persona "+
						"WHERE solicitud.vacante = " +req.params.id+ " AND solicitud.estado != 'Revisada';", function(err, result){
		if(err) throw err;
		res.json({content: result});
	});
});

app.put("/solicitud/marcarEnProceso/:id", (req, res) => {
	con.query("UPDATE solicitud SET estado = 'En Proceso' WHERE idSolicitud = "+req.params.id+";", function(err, result){
		if(err) throw err;
		res.json({message: "Correct"});
	})
});

app.put("/solicitud/marcarRevisada/:id", (req, res) => {
	con.query("UPDATE solicitud SET estado = 'Revisada', comentarios = '"+req.body.comments+"' WHERE idSolicitud = "+req.params.id+";", function(err, result){
		if(err) throw err;
		res.json({message: "Correct"});
	});
});

app.listen(PORT, () => {
	console.log(`Server listening on ${PORT}`);
});
