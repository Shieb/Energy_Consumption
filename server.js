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

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    console.log(req.params.selected_year);
    fs.readFile(path.join(template_dir, 'year.html'), "utf-8", (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database
        if (err) {
            res.status(404).type('txt');
            res.write('ERROR 404: cannot read year.html');
            res.end();
        } else {
            //res.status(200).type('html').send(template); // <-- you may need to change this
            let sql = `SELECT * FROM Consumption WHERE year = ?`;
            let row;
            let rowString = "";
            let year = req.params.selected_year;
            let prevYear;
            if (year > 1960) {
                prevYear = parseInt(year) - 1;
            } else {
                prevYear = 2018;
            }
            let nextYear;
            if (year < 2018) {
                nextYear = parseInt(year) + 1;
            } else {
                nextYear = 1960;
            }
            let coal_total = 0;
            let natural_gas_total = 0;
            let nuclear_total = 0;
            let petroleum_total = 0;
            let renewable_total = 0;
            let currYear;
            let yearString = "";
            let state;

            if (req.params.selected_year > 2018 || req.params.selected_year < 1960) {
                res.status(404).type('txt');
                res.write('ERROR: ' + req.params.selected_year + ' is not a valid year');
                res.end();
            }

            else {
                yearString = yearString + '<option value="' + req.params.selected_year + '"></option>';
                for (currYear = 1960; currYear <= 2018; currYear++) {
                    if (currYear != req.params.selected_year) {
                        yearString = yearString + '<option value="' + currYear + '">' + currYear + '</option>';
                    }
                }

                db.all(sql, [req.params.selected_year], (err, rows) => {
                    for (row = 0; row < rows.length; row++) {
                        let total = rows[row].coal + rows[row].natural_gas + rows[row].nuclear + rows[row].petroleum
                            + rows[row].renewable;
                        coal_total = coal_total + rows[row].coal;
                        natural_gas_total = natural_gas_total + rows[row].natural_gas;
                        nuclear_total = nuclear_total + rows[row].nuclear;
                        petroleum_total = petroleum_total + rows[row].petroleum;
                        renewable_total = renewable_total + rows[row].renewable;
                        
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
                    template = template.replace('{{YEAR_LINKS}}', yearString);
                    template = template.replace('{{DATA}}', rowString);
                    template = template.replace('{{COAL_TOTAL}}', coal_total);
                    template = template.replace('{{NATURAL_GAS_TOTAL}}', natural_gas_total);
                    template = template.replace('{{NUCLEAR_TOTAL}}', nuclear_total);
                    template = template.replace('{{PETROLEUM_TOTAL}}', petroleum_total);
                    template = template.replace('{{RENEWABLE_TOTAL}}', renewable_total);
                    template = template.replace('{{YEAR}}', year);
                    template = template.replace('{{CURRENT_YEAR}}', year);
                    template = template.replace('{{NEXT_YEAR}}', nextYear);
                    template = template.replace('{{PREV_YEAR}}', prevYear);

                    res.status(200).type('html').send(template); 
                    //updateAndSendResponse(rowString, template, res); // <-- you may need to change this
                });
            }
        }

    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    console.log(req.params.selected_state.toUpperCase());
    fs.readFile(path.join(template_dir, 'state.html'), "utf-8", (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database
        if (err) {
            res.status(404).type('txt');
            res.write('cannot read dynamic.html');
            res.end();
        } else {
    
            let sql = 'SELECT * FROM States WHERE state_abbreviation = ?';
            let row;
            let state = '';
            let rowString = "";
            let labelsString = "";
            let coalValueString = "";
            let naturalGasValueString = "";
            let nuclearValueString = "";
            let petroleumValueString = "";
            let renewableValueString = "";

            let coalBackground = "";
            let coalBorder = "";
            let naturalGasBackground = "";
            let naturalGasBorder = "";
            let nuclearBackground = "";
            let nuclearBorder = "";
            let petroleumBackground = "";
            let petroleumBorder = "";
            let renewableBackground = "";
            let renewableBorder = "";
            let stateString = "";
            let prevState = "";
            let nextState = "";

            let p1 = new Promise((resolve, reject) => {
            
                db.all(sql, [req.params.selected_state.toUpperCase()], (err, rows) => {
                    if(err || rows.length == 0)
                        reject(err);
                    else
                    {
                        resolve(rows[0]);
                    }
                });

            });

            let p2 = new Promise((resolve, reject) => {
            
                sql = 'SELECT * FROM States';
                db.all(sql, (err, rows) => {

                    if(err)
                    {
                        reject(err);
                    }
                    else
                        resolve(rows);
                });              
            });

            let p3 = new Promise((resolve, reject) => {

                sql = `SELECT * FROM Consumption WHERE state_abbreviation = ?`;
                db.all(sql, [req.params.selected_state.toUpperCase()], (err, rows) => {
                    
                    if(err)
                        reject(err);
                    else
                        resolve(rows);
                });
                
            });
            
            Promise.all([p1, p2, p3]).then((rows) => {
                    state = rows[0].state_name;
                    
                    stateString = stateString + '<option value="' + req.params.selected_state + '"></option>';
                    for(row = 0; row < rows[1].length; row++)
                    {
                        let currState = rows[1][row].state_abbreviation;
                        stateString = stateString + '<option value="' + currState + '">' + currState + '</option>';
                        if(currState == rows[0].state_abbreviation)
                        {
                            if(currState == "AK")
                            {
                                prevState = "WY";
                                nextState = "AL";
                            }
                            else if(currState == "WY")
                            {
                                prevState = "WV";
                                nextState = "AK"; 
                            }
                            else
                            {
                                prevState = rows[1][row - 1].state_abbreviation;
                                nextState = rows[1][row + 1].state_abbreviation;
                            }
                        }
                    }


                    for(row = 0; row < rows[2].length; row++) 
                    {
                        let total = rows[2][row].coal + rows[2][row].natural_gas + rows[2][row].nuclear 
                        + rows[2][row].petroleum + rows[2][row].renewable;

                        if (row != rows[2].length && row != 0) {
                            labelsString = labelsString + ", ";
                            coalValueString = coalValueString  + ", ";
                            naturalGasValueString = naturalGasValueString + ", ";
                            nuclearValueString = nuclearValueString + ", ";
                            petroleumValueString = petroleumValueString + ", ";
                            renewableValueString = renewableValueString + ", ";

                            coalBackground = coalBackground + ", ";
                            coalBorder = coalBorder + ", ";
                            naturalGasBackground = naturalGasBackground + ", ";
                            naturalGasBorder = naturalGasBorder + ", ";
                            nuclearBackground = nuclearBackground + ", ";
                            nuclearBorder = nuclearBorder + ", ";
                            petroleumBackground = petroleumBackground + ", ";
                            petroleumBorder = petroleumBorder + ", ";
                            renewableBackground = renewableBackground + ", ";
                            renewableBorder = renewableBorder + ", ";

                        }

                        //console.log(rows[row]);
                        rowString = rowString + "<tr>";
                        rowString = rowString + "<td>" + rows[2][row].year + "</td>";
                        rowString = rowString + "<td>" + rows[2][row].coal + "</td>";
                        rowString = rowString + "<td>" + rows[2][row].natural_gas + "</td>";
                        rowString = rowString + "<td>" + rows[2][row].nuclear + "</td>";
                        rowString = rowString + "<td>" + rows[2][row].petroleum + "</td>";
                        rowString = rowString + "<td>" + rows[2][row].renewable + "</td>";
                        rowString = rowString + "<td>" + total + "</td>";
                        rowString = rowString + "</tr>";

                        labelsString = labelsString + "'" + rows[2][row].year + "'";
                        coalValueString = coalValueString + "'" + rows[2][row].coal + "'";
                        naturalGasValueString = naturalGasValueString + "'" + rows[2][row].natural_gas + "'";
                        nuclearValueString = nuclearValueString + "'" + rows[2][row].nuclear + "'";
                        petroleumValueString = petroleumValueString + "'" + rows[2][row].petroleum + "'";
                        renewableValueString = renewableValueString + "'" + rows[2][row].renewable + "'";

                        coalBackground = coalBackground + "'rgba(255, 99, 132, 0.2)'";
                        coalBorder = coalBorder + "'rgba(255, 99, 132, 1)'";
                        naturalGasBackground = naturalGasBackground + "'rgba(54, 162, 235, 0.2)'";
                        naturalGasBorder = naturalGasBorder + "'rgba(54, 162, 235, 1)'";
                        nuclearBackground = nuclearBackground + "'rgba(255, 206, 86, 0.2)'";
                        nuclearBorder = nuclearBorder + "'rgba(255, 206, 86, 1)'";
                        petroleumBackground = petroleumBackground + "'rgba(75, 192, 192, 0.2)'";
                        petroleumBorder = petroleumBorder + "'rgba(75, 192, 192, 1)'";
                        renewableBackground = renewableBackground + "'rgba(153, 102, 255, 0.2)'";
                        renewableBorder = renewableBorder + "'rgba(153, 102, 255, 1)'";
                    }

                    template = template.replace('{{STATE_PIC}}', req.params.selected_state.toLowerCase());
                    template = template.replace('{{STATE_NAME}}', state);
                    template = template.replace('{{DATA}}', rowString);

                    template = template.replace('{{NEXT_STATE}}', nextState);
                    template = template.replace('{{PREV_STATE}}', prevState);
                    template = template.replace('{{STATE_LINKS}}', stateString);
                    template = template.replace('{{LABELS}}', labelsString);
                    template = template.replace('{{COAL_VALUES}}', coalValueString);
                    template = template.replace('{{NATURAL_GAS_VALUES}}', naturalGasValueString);
                    template = template.replace('{{NUCLEAR_VALUES}}', nuclearValueString);
                    template = template.replace('{{PETROLEUM_VALUES}}', petroleumValueString);
                    template = template.replace('{{RENEWABLE_VALUES}}', renewableValueString);
                    template = template.replace('{{COAL_BACKGROUND}}', coalBackground);
                    template = template.replace('{{COAL_BORDER}}', coalBorder);
                    template = template.replace('{{NATURAL_GAS_BACKGROUND}}', naturalGasBackground);
                    template = template.replace('{{NATURAL_GAS_BORDER}}', naturalGasBorder);
                    template = template.replace('{{NUCLEAR_BACKGROUND}}', nuclearBackground);
                    template = template.replace('{{NUCLEAR_BORDER}}', nuclearBorder);
                    template = template.replace('{{PETROLEUM_BACKGROUND}}', petroleumBackground);
                    template = template.replace('{{PETROLEUM_BORDER}}', petroleumBorder);
                    template = template.replace('{{RENEWABLE_BACKGROUND}}', renewableBackground);
                    template = template.replace('{{RENEWABLE_BORDER}}', renewableBorder);


                    res.status(200).type('html').send(template);
            }).catch((error) => {
                res.status(404).type('txt').send("ERROR 404: No data for state: " + req.params.selected_state);
                console.log(error);
            });
        }
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
