// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');


let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, 'db', 'usenergy.sqlite3');

let app = express();
let port = 8000;

// open usenergy.sqlite3 database
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

app.use(express.static(public_dir)); // serve static files from 'public' directory


// GET request handler for home page '/' (redirect to /year/2018)
app.get('/', (req, res) => {
    res.redirect('/year/2018');
});
/*
function updateAndSendResponse(rowString, template, res) {
    template = template.replace('{{DATA}}', rowString);
    res.status(200).type('html').send(template); 
}
*/

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    console.log(req.params.selected_year);
    fs.readFile(path.join(template_dir, 'year.html'), "utf-8", (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database
        if (err) {
            res.status(404).type('txt');
            res.write('cannot read dynamic.html');
            res.end();
        } else {
            //res.status(200).type('html').send(template); // <-- you may need to change this
            let sql = `SELECT * FROM Consumption WHERE year = ?`;
            let row;
            let rowString = "";
            db.all(sql, [req.params.selected_year], (err, rows) => {
                //rows.forEach((row) => {
                    //console.log(row);
                //});
                for (row = 0; row < rows.length; row++) {
                    let total = rows[row].coal + rows[row].natural_gas + rows[row].nuclear + rows[row].petroleum
                        + rows[row].renewable;

                    console.log(rows[row]);
                    rowString = rowString + "<tr>";
                    rowString = rowString + "<td>" + rows[row].state_abbreviation + "</td>";
                    rowString = rowString + "<td>" + rows[row].coal + "</td>";
                    rowString = rowString + "<td>" + rows[row].natural_gas + "</td>";
                    rowString = rowString + "<td>" + rows[row].nuclear + "</td>";
                    rowString = rowString + "<td>" + rows[row].petroleum + "</td>";
                    rowString = rowString + "<td>" + rows[row].renewable + "</td>";
                    rowString = rowString + "<td>" + total + "</td>";
                    rowString = rowString + "</tr>";
                }
                template = template.replace('{{DATA}}', rowString);
                res.status(200).type('html').send(template); 
                //updateAndSendResponse(rowString, template, res); // <-- you may need to change this
            });
        }

    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    console.log(req.params.selected_state);
    fs.readFile(path.join(template_dir, 'state.html'), (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database

        res.status(200).type('html').send(template); // <-- you may need to change this
    });
});

// GET request handler for '/energy/*'
app.get('/energy/:selected_energy_source', (req, res) => {
    console.log(req.params.selected_energy_source);
    fs.readFile(path.join(template_dir, 'energy.html'), (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database

        res.status(200).type('html').send(template); // <-- you may need to change this
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
