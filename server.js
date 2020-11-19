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
    fs.readFile(path.join(template_dir, 'energy.html'),"utf8", (err, template) => {
        
        if (err) {
            res.status(404).type('txt');
            res.write('cannot read energy.html');
            res.end();
        } else {
            let exist = true;
            let energy_type = req.params.selected_energy_source;
            if(energy_type != "coal" && energy_type != "renewable" &&energy_type != "nuclear" &&energy_type != "petroleum" &&energy_type != "natural_gas"){
                res.status(404).type('txt');
                res.write('cannot find data for '+energy_type);
                res.end();
                exist = false;

            }
            console.log(energy_type);
            let energythings = ['coal','renewable','petroleum','natural_gas', 'nuclear'];
            let prev;
            let next;
            if(energy_type == "coal"){
                prev = energythings[4];
                next = energythings[1];
            }

            if(energy_type == "renewable"){
                prev = energythings[0];
                next = energythings[2];
            }
            if(energy_type == "petroleum"){
                prev = energythings[1];
                next = energythings[3];
            }
            if(energy_type == "natural_gas"){
                prev = energythings[2];
                next = energythings[4];
            }
            if(energy_type == "nuclear"){
                prev = energythings[3];
                next = energythings[0];
            }
            let sql = 'SELECT year, state_abbreviation, '+energy_type+' FROM Consumption WHERE true group by state_abbreviation, year'
            let energy_counts = 0;
            let year = "";
            let state_abbreviation = "";
            let rowString = "";
            let labelsString = "";
            let counter = 0;
            let i;
            let energylinks = '<option value=""></option><option value="coal">coal</option><option value="renewable">renewable</option><option value="petroleum">petroleum</option><option value="natural_gas">natural_gas</option><option value="nuclear">nuclear</option>';
            let AKe = "";
            let ALe = "";
            let ARe = "";
            let AZe = "";
            let CAe = "";
            let COe = "";
            let CTe = "";
            let DEe = "";
            let FLe = "";
            let GAe = "";
            let HIe = "";
            let IAe = "";
            let IDe = "";
            let ILe = "";
            let INe = "";
            let KSe = "";
            let KYe = "";
            let LAe = "";
            let MAe = "";
            let MDe = "";
            let MEe = "";
            let MIe = "";
            let MNe = "";
            let MOe = "";
            let MSe = "";
            let MTe = "";
            let NCe = "";
            let NDe = "";
            let NEe = "";
            let NHe = "";
            let NJe = "";
            let NMe = "";
            let NVe = "";
            let NYe = "";
            let OHe = "";
            let OKe = "";
            let ORe = "";
            let PAe = "";
            let RIe = "";
            let SCe = "";
            let SDe = "";
            let TNe = "";
            let TXe = "";
            let UTe = "";
            let VAe = "";
            let VTe = "";
            let WAe = "";
            let WIe = "";
            let WVe = "";
            let WYe = "";
            let DCe = "";
            if(exist){
            db.all(sql,[], (err, rows) => {
                
                if(err){
                    console.log(err);
                }
                for(i=0; i < rows.length;i++){
                    
                    if (counter == 51){
                        counter = 0;
                        rowString = rowString + "</tr>";
                    }

                    if(counter == 0){
                        rowString = rowString + "<tr>";
                        rowString = rowString + "<td>" + rows[i].year+ "</td>";
                        
                            labelsString = labelsString + "'" +rows[i].year+"',"; 
                        
                    }
                    counter = counter+1;

                    rowString = rowString + "<td>" + rows[i][energy_type]+"</td>";

                    if(rows[i].state_abbreviation == "AK"){
                        if(AKe == ""){
                            AKe = rows[i][energy_type];
                        } else {
                            AKe = AKe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "AL"){
                        if(ALe == ""){
                            ALe = rows[i][energy_type];
                        } else {
                            ALe = ALe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "AR"){
                        if(ARe == ""){
                            ARe = rows[i][energy_type];
                        } else {
                            ARe = ARe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "AZ"){
                        if(AKe == ""){
                            AZe = rows[i][energy_type];
                        } else {
                            AZe = AZe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "CA"){
                        if(CAe == ""){
                            CAe = rows[i][energy_type];
                        } else {
                            CAe = CAe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "CO"){
                        if(COe == ""){
                            COe = rows[i][energy_type];
                        } else {
                            COe = COe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "CT"){
                        if(CTe == ""){
                            CTe = rows[i][energy_type];
                        } else {
                            CTe = CTe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "DC"){
                        if(DCe == ""){
                            DCe = rows[i][energy_type];
                        } else {
                            DCe = DCe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "DE"){
                        if(DEe == ""){
                            DEe = rows[i][energy_type];
                        } else {
                            DEe = DEe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "FL"){
                        if(FLe == ""){
                            FLe = rows[i][energy_type];
                        } else {
                            FLe = FLe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "GA"){
                        if(GAe == ""){
                            GAe = rows[i][energy_type];
                        } else {
                            GAe = GAe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "HI"){
                        if(HIe == ""){
                            HIe = rows[i][energy_type];
                        } else {
                            HIe = HIe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "IA"){
                        if(IAe == ""){
                            IAe = rows[i][energy_type];
                        } else {
                            IAe = IAe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "ID"){
                        if(IDe == ""){
                            IDe = rows[i][energy_type];
                        } else {
                            IDe = IDe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "IL"){
                        if(ILe == ""){
                            ILe = rows[i][energy_type];
                        } else {
                            ILe = ILe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "IN"){
                        if(INe == ""){
                            INe = rows[i][energy_type];
                        } else {
                            INe = INe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "KS"){
                        if(KSe == ""){
                            KSe = rows[i][energy_type];
                        } else {
                            KSe = KSe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "KY"){
                        if(KYe == ""){
                            KYe = rows[i][energy_type];
                        } else {
                            KYe = KYe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "LA"){
                        if(LAe == ""){
                            LAe = rows[i][energy_type];
                        } else {
                            LAe = LAe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "MA"){
                        if(MAe == ""){
                            MAe = rows[i][energy_type];
                        } else {
                            MAe = MAe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "ME"){
                        if(MEe == ""){
                            MEe = rows[i][energy_type];
                        } else {
                            MEe = MEe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "MI"){
                        if(MIe == ""){
                            MIe = rows[i][energy_type];
                        } else {
                            MIe = MIe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "MN"){
                        if(MNe == ""){
                            MNe = rows[i][energy_type];
                        } else {
                            MNe = MNe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "MO"){
                        if(MOe == ""){
                            MOe = rows[i][energy_type];
                        } else {
                            MOe = MOe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "MS"){
                        if(MSe == ""){
                            MSe = rows[i][energy_type];
                        } else {
                            MSe = MSe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "MT"){
                        if(MTe == ""){
                            MTe = rows[i][energy_type];
                        } else {
                            MTe = MTe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "NC"){
                        if(NCe == ""){
                            NCe = rows[i][energy_type];
                        } else {
                            NCe = NCe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "ND"){
                        if(NDe == ""){
                            NDe = rows[i][energy_type];
                        } else {
                            NDe = NDe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "NE"){
                        if(NEe == ""){
                            NEe = rows[i][energy_type];
                        } else {
                            NEe = NEe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "NH"){
                        if(NHe == ""){
                            NHe = rows[i][energy_type];
                        } else {
                            NHe = NHe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "NJ"){
                        if(NJe == ""){
                            NJe = rows[i][energy_type];
                        } else {
                            NJe = NJe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "NM"){
                        if(NMe == ""){
                            NMe = rows[i][energy_type];
                        } else {
                            NMe = NMe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "NV"){
                        if(NVe == ""){
                            NVe = rows[i][energy_type];
                        } else {
                            NVe = NVe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "NY"){
                        if(NYe == ""){
                            NYe = rows[i][energy_type];
                        } else {
                            NYe = NYe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "OH"){
                        if(OHe == ""){
                            OHe = rows[i][energy_type];
                        } else {
                            OHe = OHe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "OK"){
                        if(OKe == ""){
                            OKe = rows[i][energy_type];
                        } else {
                            OKe = OKe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "OR"){
                        if(ORe == ""){
                            ORe = rows[i][energy_type];
                        } else {
                            ORe = ORe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "PA"){
                        if(PAe == ""){
                            PAe = rows[i][energy_type];
                        } else {
                            PAe = PAe +","+rows[i][energy_type];
                        }
                        
                    }
                     
                    if(rows[i].state_abbreviation == "RI"){
                        if(RIe == ""){
                            RIe = rows[i][energy_type];
                        } else {
                            RIe = RIe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "SC"){
                        if(SCe == ""){
                            SCe = rows[i][energy_type];
                        } else {
                            SCe = SCe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "SD"){
                        if(SDe == ""){
                            SDe = rows[i][energy_type];
                        } else {
                            SDe = SDe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "TN"){
                        if(TNe == ""){
                            TNe = rows[i][energy_type];
                        } else {
                            TNe = TNe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "TX"){
                        if(TXe == ""){
                            TXe = rows[i][energy_type];
                        } else {
                            TXe = TXe +","+rows[i][energy_type];
                        }
                        
                    }

                    if(rows[i].state_abbreviation == "UT"){
                        if(UTe == ""){
                            UTe = rows[i][energy_type];
                        } else {
                            UTe = UTe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "VA"){
                        if(VAe == ""){
                            VAe = rows[i][energy_type];
                        } else {
                            VAe = VAe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "VT"){
                        if(VTe == ""){
                            VTe = rows[i][energy_type];
                        } else {
                            VTe = VTe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "WA"){
                        if(WAe == ""){
                            WAe = rows[i][energy_type];
                        } else {
                            WAe = WAe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "WI"){
                        if(AKe == ""){
                            WIe = rows[i][energy_type];
                        } else {
                            WIe = WIe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "WV"){
                        if(WVe == ""){
                            WVe = rows[i][energy_type];
                        } else {
                            WVe = WVe +","+rows[i][energy_type];
                        }
                        
                    }
                    if(rows[i].state_abbreviation == "WY"){
                        if(WYe == ""){
                            WYe = rows[i][energy_type];
                        } else {
                            WYe = WYe +","+rows[i][energy_type];
                        }
                        
                    }

                }

                let image = "../"+energy_type+".jpg";
                let alt = "image of "+energy_type;
                labelsString = labelsString.substring(0, labelsString.length - 1);
                template = template.replace('{{AKE}}',"["+AKe+"]");
                template = template.replace('{{ALE}}',"["+ALe+"]");
                template = template.replace('{{ARE}}',"["+ARe+"]");
                template = template.replace('{{AZE}}',"["+AZe+"]");
                template = template.replace('{{CAE}}',"["+CAe+"]");
                template = template.replace('{{COE}}',"["+COe+"]");
                template = template.replace('{{CTE}}',"["+CTe+"]");
                template = template.replace('{{DEE}}',"["+DEe+"]");
                template = template.replace('{{FLE}}',"["+FLe+"]");
                template = template.replace('{{GAE}}',"["+GAe+"]");
                template = template.replace('{{HIE}}',"["+HIe+"]");
                template = template.replace('{{IAE}}',"["+IAe+"]");
                template = template.replace('{{IDE}}',"["+IDe+"]");
                template = template.replace('{{ILE}}',"["+ILe+"]");
                template = template.replace('{{INE}}',"["+INe+"]");
                template = template.replace('{{KSE}}',"["+KSe+"]");
                template = template.replace('{{KYE}}',"["+KYe+"]");
                template = template.replace('{{LAE}}',"["+LAe+"]");
                template = template.replace('{{MAE}}',"["+MAe+"]");
                template = template.replace('{{MDE}}',"["+MDe+"]");
                template = template.replace('{{MEE}}',"["+MEe+"]");
                template = template.replace('{{MIE}}',"["+MIe+"]");
                template = template.replace('{{MNE}}',"["+MNe+"]");
                template = template.replace('{{MOE}}',"["+MOe+"]");
                template = template.replace('{{MSE}}',"["+MSe+"]");
                template = template.replace('{{MTE}}',"["+MTe+"]");
                template = template.replace('{{NCE}}',"["+NCe+"]");
                template = template.replace('{{NDE}}',"["+NDe+"]");
                template = template.replace('{{NEE}}',"["+NEe+"]");
                template = template.replace('{{NHE}}',"["+NHe+"]");
                template = template.replace('{{NJE}}',"["+NJe+"]");
                template = template.replace('{{NME}}',"["+NMe+"]");
                template = template.replace('{{NVE}}',"["+NVe+"]");
                template = template.replace('{{NYE}}',"["+NYe+"]");
                template = template.replace('{{OHE}}',"["+OHe+"]");
                template = template.replace('{{OKE}}',"["+OKe+"]");
                template = template.replace('{{ORE}}',"["+ORe+"]");
                template = template.replace('{{PAE}}',"["+PAe+"]");
                template = template.replace('{{RIE}}',"["+RIe+"]");
                template = template.replace('{{SCE}}',"["+SCe+"]");
                template = template.replace('{{SDE}}',"["+SDe+"]");
                template = template.replace('{{TNE}}',"["+TNe+"]");
                template = template.replace('{{TXE}}',"["+TXe+"]");
                template = template.replace('{{UTE}}',"["+UTe+"]");
                template = template.replace('{{VAE}}',"["+VAe+"]");
                template = template.replace('{{VTE}}',"["+VTe+"]");
                template = template.replace('{{WAE}}',"["+WAe+"]");
                template = template.replace('{{WIE}}',"["+WIe+"]");
                template = template.replace('{{WVE}}',"["+WVe+"]");
                template = template.replace('{{WYE}}',"["+WYe+"]");
                template = template.replace('{{DCE}}',"["+DCe+"]");
                template = template.replace('{{ENERGY_LINKS}}',energylinks);
                template = template.replace('{{LABELS}}',labelsString);
                template = template.replace('{{DATA}}', rowString);
                template = template.replace('{{TYPE2}}', req.params.selected_energy_source.toUpperCase());
                template = template.replace('{{COUNTS}}', energy_counts);
                template = template.replace('{{STATE}}', state_abbreviation);
                template = template.replace('{{YEAR}}', year);
                template = template.replace('{{IMAGEe}}', image);
                template = template.replace('{{ALTe}}', alt);
                template = template.replace('{{PREV}}', prev);
                template = template.replace('{{NEXT}}', next);
                
               
                    res.status(200).type('html').send(template);
                
                 
            });
        }    
        }
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
