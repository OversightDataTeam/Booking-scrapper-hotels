const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const pLimit = require('p-limit');

puppeteer.use(StealthPlugin());

// Blacklist d'emails à exclure
const EMAIL_BLACKLIST = [
    'info@accommodators.net',
    'jbrecknell@urban-creation.com',
    'julian.foster@rgroup.co.uk',
    'info@mantalli.com',
    'brandon@artsyproperties.com',
    'ali@hydeparksuites.com',
    'ms.msari@gmail.com',
    'enquiries@nativeplaces.com',
    'iperinvestment@gmail.com',
    'eprelocationltd@gmail.com',
    'sales@condokeeper.co.uk',
    'adaerltd@gmail.com',
    'rmc29ltd@gmail.com',
    'hello@guest365.co.uk',
    'megan@outofofficelifestyle.com',
    'admin@cityairapartments.com',
    'bookings@adjoinhomes.com',
    'michele.fantin@hotmail.com',
    'muppy1501@icloud.com',
    'info@keyholcoliving.co.uk',
    'hello@artestays.com',
    'ciao@italianflat.com',
    'bnbnovastay@gmail.com',
    'gwynnlets@gmail.com',
    'info@ahometorent.com',
    'info@holidaysluxuryexperience.co.uk',
    'info@nellgwynnchelsea.london',
    'reservations@ccjnhomes.com',
    'yotamsbnb@gmail.com',
    'accounts@caltonliving.com',
    'info@fostermarlon.com',
    'info@arlingtonhouse.co.uk',
    'office@thetayhouse.co.uk',
    'info@tsclondon.co.uk',
    'info@tadyventurescon.co.uk',
    'officeboshundhora@gmail.com',
    'info@foxter.co.ukj',
    'ross@rupalettings.co.uk',
    'hello@yourstayhaven.co.uk',
    'info@keyhostlondon.com',
    'info@uniquepropertyservices.co.uk',
    'info@bedstostay.com',
    'pm@mvp-slm.co.uk',
    'info@belgravia-apartments.co.uk',
    'reservations@roomspace.com',
    'reservations@hausd.co',
    'reservations@sloanesquarehotel.co.uk',
    'hello@thedesigntraveller.co',
    'ciccottodiego@gmail.com',
    'islingtonapartment@gmail.com',
    'info@stayaura.com',
    'mrsunrise2024@hotmail.com',
    'bookings@smart-stays.co.uk',
    'ainur@ybcap.com',
    'reservations@staycozy.com',
    'hello@city-space.com',
    'london@bymansley.com',
    'homeshadwell@gmail.com',
    'info@cityguest.co.uk',
    'reservations@eson2.co.uk',
    'cem@campbell-properties.co.uk',
    'booking@nestify.co.uk',
    'hello@kip.london',
    'contact@mcmullens.co.uk',
    'hello@mason-fifth.com',
    'georgina@lotinga.com',
    'contact@goldstays.co',
    'enquires@buckinghamandlloyds.com',
    'info@the-nant.co.uk',
    'reservations@astorcourthotel.co.uk',
    'accounts@charleshope.co.uk',
    'city-living@h-s-c.co.uk',
    'ahmed@capitalstay.co.uk',
    'kingagriffiths@yahoo.com',
    'reservations@theleonard.com',
    'info@royallancaster.com',
    'rashed@kravens.co.uk',
    'reception@keystone-group.net',
    'adipopolo@hotmail.com',
    'jenifer@k-hotel.co.uk',
    'admin@wealthchurchhomes.com',
    'info@avariapartments.com',
    'bookings@travelnest.com',
    'estatesmenltd@gmail.com',
    'hello@otherhouse.com',
    'nitebooking@gmail.com',
    'info@chilternstreetapartments.com',
    'london@guestready.com',
    'emclondonltd@outlook.com',
    'info@noxhotels.co.uk',
    'sales-lon@theblueground.com',
    'massi@mxlettings.com',
    'grouplettingsj2@gmail.com',
    'info@citystayapartsuk.com',
    'boyanproperties@gmail.com',
    'info@manageyourplace.com',
    'ssemakulamose@gmail.com',
    'vc@epic-solutions.co.uk',
    'keyholcoliving@gmail.com',
    'hollie@mxlettings.com',
    'enquiries@companieshouse.gov.uk',
    'kyle@kingtut.co.za',
    'sohoabode@gmail.com',
    'londonss@yahoo.com',
    'david@maximumconstruction.co.uk',
    'oredola_amali@yahoo.com',
    'izelseloni@gmail.com',
    'hjaluxerentals@gmail.com',
    'dehouseltd2@gmail.com',
    'charley@vendeco.com',
    'admin@danpropertys.co.uk',
    'londonlettings365@gmail.com',
    'hello@honesthomes.co.uk',
    'info@bee-my-guest.com',
    'judyciok@coopyproperties.co.uk',
    'becky@properties-on-sea.co.uk',
    'martin@uiaprojects.com',
    'visionaryhospitalityuk@gmail.com',
    'theleinstergardens@gmail.com',
    'mario@redcordproperties.co.uk',
    'hr@thelondontenant.com',
    'olgamantsiou@gmail.com',
    'marco@winstongroup.co.uk',
    'point1property@gmail.com',
    'stellarpropertymgt@gmail.com',
    'hasanakan.civilengineer@gmail.com',
    'welcome@londonchoiceapartments.com',
    'nomadstayshome@gmail.com',
    'contact@maresca-servicedapartments.co.uk',
    'info@trustayapartments.com',
    'sinsat86@gmail.com',
    'info@gaeapropertygroup.co.uk',
    'paxcentric@gmail.com',
    'gonzalo.properties@gmail.com',
    'properties@bonchev.co.uk',
    'info@commodum.homes',
    'mahleeksalawu@denarahomes.co.uk',
    'ramona@grandapartments.co.uk',
    'accounts@landunion.com',
    'info@austindavidapartments.co.uk',
    'emeraldapartmentsuk@gmail.com',
    'lettings@smart-stay.co.uk',
    'info.rexstone@gmail.com',
    'jmuzah@yahoo.com',
    'aliwasity@gmail.com',
    'londoncastleltd@gmail.com',
    'james@murraycommercial.co.uk',
    'info@hybridresi.com',
    'sales@flyingbutler.com',
    'info@londonbridgeapartments.com',
    'cs@kchg.co.uk',
    'cambusomayhotel@gmail.com',
    'stay@clermonthotel.group',
    'jin5566888@gmail.com',
    'info@beauforthouse.co.uk',
    'rod.townson@yahoo.com',
    'reservation@mskresidence.com',
    'salvo@rueliving.co.uk',
    'reservations@presidential-kensington.com',
    'guest@houst.com',
    'reservations@guardsmanhotel.com',
    'support@mypropertyhost.com',
    'edwardbromet@gmail.com',
    'diegociccotto@hotmail.co.uk',
    'hello@locationlink.co.uk',
    'anvlapo@gmail.com',
    'ricky@bellefair.com',
    'ketandhaliwal@hotmail.co.uk',
    'hello@argyl.co.uk',
    'sariguholdings@gmail.com',
    'general@development-capital.link',
    'reservations@my-urbanchic.com',
    'atif@threstle.com',
    'creativesolutionsldn@gmail.com',
    'rgresidences@hotmail.com',
    'property@napilondon.com',
    'contact@orestoproperties.com',
    'reservations@themarloes.com',
    'hello@thamesrelocation.com',
    'admin@robindoor.com',
    'thealma.islington@gmail.com',
    'info@mi-shortstay.co.uk',
    'rainbowtowerbridge@gmail.com',
    'jagaaa@vp.pl',
    'molina@paramounthomes.es',
    'dukeofleinsterhotel@crystalhotels.co.uk',
    'stay@westaygroup.com',
    'lucyboye@hotmail.co.uk',
    'eriksaiti@yahoo.com',
    'info@london-apartment-rental.com',
    'hotelsales@fullers.co.uk',
    'admin@beemyhost.com',
    'raj.raithatha@icloud.com',
    'turgutt.ogluu@gmail.com',
    'hello@mycitynest.com',
    'hi@omegarentals.co.uk',
    'info@goodstayproperties.co.uk',
    'reservations@passthekeys.co.uk',
    'lanaalmuallem@gmail.com',
    'info@cacciaris.co.uk',
    'accommodation@huddletons.com',
    '63fernheadrd@gmail.com',
    'reservations@vestostays.com',
    'scion.assets.ltd@gmail.com',
    'recp.indigo@lth-hotels.com',
    'aaamirsaleh@icloud.com',
    'sovereignpropertysolutions@gmail.com',
    'gerclubhosts@gmail.com',
    'agalan@thesharingco.com',
    'devonshirehorizon@outlook.com',
    'works@heartscltd.co.uk',
    'reservations@cur8residences.com',
    'info@vistaproperty.com',
    'operations@ukaccom.co.uk',
    'info@smartmoveaccommodation.com',
    'stay@parealiving.co.uk',
    'gareth@accommodationlondon.net',
    'paolo3.deschmann@gmail.com',
    'info@downton-property.co.uk',
    'sunny.lands.property@hotmail.com',
    'contact@upper-residences.com',
    'info@trstays.net',
    'reservations@ayli.co.uk',
    'arifrm.limited@gmail.com',
    'roomsofopulence@gmail.com',
    'longviewleverage@gmail.com',
    'reservations@penthousestays.com',
    'amoor24@hotmail.com',
    'info@eztenantguaranteed.com',
    'info@onethousanddoors.com',
    'info@azzurriproperties.com',
    'office@wildroses.uk',
    'debb@taliaprime.com',
    'contact@snuggl.co.uk',
    'centralisproperties@gmail.com',
    'anchorstayco@gmail.com',
    'hello@108london.com',
    'mightydouglas2@gmail.com',
    'silaozkanuk@gmail.com',
    'ilkin@vilenza.com',
    'info@urban-key.co.uk',
    'anbinvestmentlondonltd@outlook.com',
    'lettings@foundationestates.co.uk',
    'bookings@airoperate.com',
    'cem.gul@cgdnb.co.uk',
    'dainius@stayinlondon.co.uk',
    'xxx.flats@gmail.com',
    'reservations@flemings.co.uk',
    'askturing@lockeliving.com',
    'platforms@uniflx.om',
    'info@troyhotel.net',
    'bookings@dc-londonrooms.com',
    'royalgreenwichhospitality@outlook.com',
    'manage@lettsgetsmart.com',
    'hello@weyuvapartments.co.uk',
    'shortlets@london-executive.com',
    'info@bb-belgravia.com',
    '80degrees101@gmail.com',
    'info@maysagroup.co.uk',
    'gwestldn@gmail.com',
    'michael@palmaris.london',
    'info@avenueestate.co.uk',
    'reservations@urbaniastay.com',
    'reservations@staysapart.com',
    'oladoke@portobellopost.co.uk',
    'samuelcbirch@gmail.com',
    'hassanadel555@hotmail.com',
    'enquiries@southkensingtonstudios.com',
    'helloreservationslondon@gmail.com',
    'info@parklane.co.uk',
    'hamza@regalrealms.co.uk',
    'reservations@grangehotels.com',
    'info@fairwayhosting.co.uk',
    'info@d8house.com',
    'info@habitatia.co.uk',
    'hello@hiatusstays.com',
    'john@thestressfreegroup.com',
    'info@tenantify.co.uk',
    'fernhillhomes@gmail.com',
    'enquiries@airpeaceofmind.com',
    'info@szestates.co.uk',
    'rpaw@sloaneclub.co.uk',
    'admin@kmkh.co.uk',
    'accounting@thehostclub.com',
    'reservations@thewhpgroup.com',
    'mac@zenstays.uk',
    'office@reandco.com',
    'citylivingapartments@outlook.com',
    'customerservice@gmail.com',
    'ssaad7323@gmail.com',
    'ssullivan@shhotelsandresorts.com',
    'ytdresidential@gmail.com',
    'nisha@arlingtonestates.co.uk',
    'info@sightflats.com',
    'sales@living-rooms.co.uk',
    'info@accacc.co.uk',
    'jorgelombana09@gmail.com',
    'raffaella.ruggeri@comohotels.com',
    'capitalstays1@hotmail.com',
    'eylem.ozgun@centralparkcollection.co.uk',
    'info@ecimproperty.com',
    'guest@skyvillion.com',
    'hello@wefound.uk',
    'info@sloanesgroup.com',
    'hello@yourairhost.co.uk',
    'team@fidelisestate.com',
    'info@michaeldrews.com',
    'starestates.sa@hotmail.com',
    'londoneasy4u.marketing@gmail.com',
    'info@arletaone.com',
    'silvia@dormoa.com',
    'gabrielemeriggi@yahoo.it',
    'f.zein@stoneapp.co.uk',
    'jarek@myletting.co.uk',
    'info@thelondonhost.com',
    'gaurav@lyonslondon.co.uk',
    'alex@savantliving.co.uk',
    'carol@bigcityestates.com',
    'raz@wooia.net',
    'sam@business-discovery.co.uk',
    'ozana@bridgeeuropeconsulting.com',
    'luxevilla24@gmail.com',
    'support@passtheproperty.co.uk',
    'samimayo@live.co.uk',
    'zelda@seymourproperties.co.za',
    'viral@mnshospitality.co.uk',
    'info@marylebonevillageapartments.co.uk',
    'chowdhury.jolil@yahoo.com',
    'stay@londonpads.co',
    'info@brownswordhotels.co.uk',
    'reservation.stgeorges@gmail.com',
    'info@sweetstay.com',
    'shapropertyltd@gmail.com',
    'frances@alonglet.co.uk',
    'info@corporatestays.net',
    'enghouse2024@hotmail.com',
    'n.bahous@fairstate.co.uk',
    'rentals@thelondonagent.com',
    'hello@stayandescape.com',
    'james@dohertypropertyservices.com',
    'info@morethanstays.com',
    'luisfernandomarinvasquez@gmail.com',
    'info@amarco.co.uk',
    'amgad.andrawis@gmail.com',
    'matthew.moran@alurapartments.co.uk',
    'stay@37gsresidences.com',
    'sachin@thebeverleygroup.com',
    'dan@stuhomes.com',
    'charlie@yourapartment.com',
    'info@stay-london.com',
    'homefieldlodge@outlook.com',
    'kasomk@yahoo.com',
    'longridgeflats@gmail.com',
    'info@widenwest.com',
    'info@sw1apartments.com',
    'reservations@mindtheflat.co.uk',
    'info@ilivingproperties.co.uk',
    'accounts@thechapterhotels.co.uk',
    'info@uniquepropertyservices.co.uk',
    'info@gardenviewhotel.co.uk',
    'tasko6996?@gmail.com',
    'spasevskasanja@yahoo.com',
    'mj@sandersonslondon.co.uk',
    'patrick@elkayproperties.co.uk',
    'brendasaparthotellondon@gmail.com',
    'wsa_dental@yahoo.co.uk',
    'info@primus-property.com',
    'aa.argyrou@gmail.com',
    'bellajhatakia@gmail.com',
    'info@circlelet.co.uk',
    'metinbayram@hotmail.co.uk',
    'doveapartments@outlook.com',
    'reservations@rockwelleast.com',
    'admin@ragproperty.com',
    'admin@livestay.co.uk',
    'contact@cityscapepropertypartners.co.uk',
    'stay@thesqua.re',
    'huruy83gas@yahoo.com',
    'reservations@20hertfordstreet.co.uk',
    'hello@frankiesays.uk',
    'm_nu@hotmail.co.uk',
    'mborjak@caffeconcerto.co.uk',
    'guest@banksialondon.com',
    'amycbartlett@bartlettmanagement.co.uk',
    'anisha_kamal@hotmail.co.uk',
    'contact@tavistockplaceapartments.com',
    'ying@yingglobal.com',
    'mail@frognal.co.uk',
    'info@crashpadsshoreditch.com',
    'administration@irentyou.co.uk',
    'administration@irentyou.co.uk',
    'alistingrentals@gmail.com',
    'nieemkhan@hotmail.co.uk',
    'dinesh@benhams.com',
    'theeight@workham.com',
    'info@chaltons.com',
    'daniel@thesuitelife.uk',
    '29nightingalesuites@gmail.com',
    'info@belgraviastay.com',
    'accounts@newagelettings.co.uk',
    'info@placify.co.uk',
    'info@hububb.co.uk',
    'support@sloaneandcadogan.com',
    'aqeelk@hotmail.co.uk',
    'info@gotolets.com',
    'redcliffe@clevelandresidences.co.uk',
    'reservations.england@joivy.com',
    'rashidi.jawid@icloud.com',
    'julinda.sharra@yahoo.co.uk',
    'ez.sohobnb@gmail.com',
    'bookings@smarthost.co.uk',
    'helena@athenapropertylondon.com',
    'jolana@live.co.uk',
    'sleep@supercityuk.com',
    'info@airlandlords.co.uk',
    'info@findyourdwelling.com',
    'info@moorenproperty.com',
    'nuranights@gmail.com',
    'thereegency@gmail.com',
    'angorapropertieslimited@gmail.com',
    'justinbooking325@gmail.com',
    'zuhal_propertyinvestments@hotmail.com',
    'mail@lyallhotel.com',
    'marcrutt@yahoo.co.uk',
    'corentin@seekerestates.com',
    'dinorozmandesign@gmail.com',
    'sales@monarchhouse.co.uk',
    'oldbromptongallery@gmail.com',
    'reservations@imperialstay.com',
    'shortstay11@yahoo.com',
    'support@ziderides.com',
    'bookings@estagegroup.co.uk',
    'mr_properties@outlook.com',
    'haysams@gmail.com',
    'booking@roomhomestay.com',
    'favoureloka@gmail.com',
    'shiv@dreamlikeproperties.com',
    'snezanajackson.mac@me.com',
    'hussein@plga-ltd.com',
    'info@finestretreats.co.uk',
    'se1rooms@gmail.com',
    'bookinga@elitestay.co.uk',
    'enquiries@veeve.com',
    'bookings@underthedoormat.com',
    'reservations@hotelgothamnewcastle.co.uk',
    'shahidaandsonsltd@gmail.com',
    'info@primestaylondon.com',
    'thomas@primestaylondon.com',
    'aburgesscochrane@gmail.com',
    'info@shorttermstaysuk.com',
    'reservations@comfy-cloud.co.uk',
    'support@balloonbnb.com',
    'info@thefinerdwellingcompany.com',
    'dante@arhouseapartments.co.uk',
    'hello@huxhotel.com',
    'emerson.tenas@erteproperties.co.uk',
    'chriss@soteriaproperty.co.uk',
    'harry.willingale@montagueproperty.uk',
    'management@gkalpha.co.uk',
    'sales@travel-house-international.com',
    'ateeq@keyflats.com',
    'kekelwas@yahoo.co.uk',
    'phoenixestategroup@gmail.com',
    'smeluux@gmail.com',
    'info@stathanshotel.com',
    'info@bloomson.com',
    'info@williammorrisproperty.com',
    'reservations@pillorooms.com',
    'reservations@picktheplace.co.uk',
    'info@maysagroup.co.uk',
    'heriotukbookings@gmail.com',
    'oroworth@happyrelocations.com',
    'enquiries@tempstay.co.uk',
    'info@londoners.com',
    'yourstay@capitalaccommodation.co.uk',
    'reception@urbanretreatapartments.co.uk',
    'hello@be.london',
    'mark.hudson@nestorstay.com',
    'reservations@conceptlondon.co.uk',
    'info@arcorelondon.com',
    'guest@ghost-hosts.com',
    'liz@lizardproperty.co.uk',
    'hosting@colberg.co.uk',
    'victoriaerario@gmail.com',
    'alexandra_ley@hotmail.com',
    'reservations@mayfairhouselondon.co.uk',
    'info@blook.co.uk',
    'stay@simplyroomsandsuiteshotel.co.uk',
    'patricia-urbinati@hotmail.com',
    'tom@fivemapartments.com',
    'dowpropertiesbooking@gmail.com',
    'premier@eurotravellerhotel.com',
    'londonpsm@outlook.com',
    'hello@key2guest.co.uk',
    'rotaru.olya@gmail.com',
    'hello@keey.uk',
    'shortlets@residentialland.com',
    'family.workhavenstays@gmail.com',
    'info@nottinghillhouse.co.uk',
    'sugars.property@gmail.com',
    'belal@alanmartin.co.uk',
    'reservations@grandplazaemail.co.uk',
    'primehomm@hotmail.com',
    'mateenfarooq_1990@hotmail.com',
    'enquiries@alesestate.com',
    'reservations@thelondoner.com',
    'malikzafar2001@gmail.com',
    'info@cometolondon.net',
    'admin@hydeparkhotels.com',
    'keithmacrae@btinternet.com',
    'voyageproperties64@gmail.com',
    'enquiries@londonbathproperty.com',
    'lec.estatemanagement@gmail.com',
    'info@londwell.com',
    'f.bostandzhieva@yahoo.co.uk',
    'concierge2@crystalwatersglobal.com',
    'youcef@yoshouse.com',
    'bedspokeltd@gmail.com',
    'support@travelhyve.co.uk',
    'admin@domistay.co.uk',
    'mystaylondon247@gmail.com',
    'marco@perlflag.co.uk',
    'hassan@beiroom.co.uk',
    'hello@southplacehotel.com',
    'reservations@hertfordstreet.com',
    'booking@shiltonstreet.com',
    'enquiries@stilllifeglobal.com',
    'lukafoxon@hotmail.co.uk',
    'info@zegieproperties.com',
    'groups@zedwellhotels.com',
    'meron@hiberhousing.co.uk',
    'info@nomadslondon.co.uk',
    'lettingshomtel@gmail.com',
    'book@londonluxapartments.com',
    'mek.2210@gmail.com',
    's.s.nangpal@icloud.com',
    'nestlelondonuk@gmail.com',
    'info@welcome.london',
    'lee@secondnest.co.uk',
    'totleyltd@gmail.com',
    'reservations@chevalcollection.com',
    'angie@staylike.com',
    'ondonapartmentsukltd@gmail.com',
    'hello@londonbase.co',
    'guestservices@globeapt.com',
    'hotelhubsproperty@gmail.com',
    'info@expertproperties.co.uk',
    'sarah.solanki@hbsv.com',
    'hello@houseofkip.com',
    'shariq@maykenbel.com',
    'admin@magicstay.co',
    'holidays@veevohome.com',
    'rentalzak@gmail.com',
    'reservations@thehydehotel.com',
    'edinburgh.reception@residenthotels.com',
    'aeinvestmentlondonltd@gmail.com',
    'stbukhari45@gmail.com',
    'corcioavacatalin@gmail.com',
    'luxurylondonhomes24@gmail.com',
    'hello@nexiproperty.com',
    'limasholiday727@gmail.com',
    'contact@archfieldresidences.com',
    'teampraedstreet@gmail.com',
    'judefarringdon@gmail.com',
    'info@pluxa.co.uk',
    'info@tjohnrealestate.com',
    'cozy28@outlook.com',
    'info@milamanagement.co.uk',
    'info@kmipm.co.uk',
    'primestayservice@gmail.com',
    'info@avstays.co.uk',
    'save.stay.management@gmail.com',
    'londonpaddingtonapartments@gmail.com',
    'littlemoonpm@gmail.com',
    'contact@jvcpremiumlettings.com',
    'info@jrspropertygroupltd.co.uk',
    'info@cityguest.co.uk',
    'reservations@urban-stay.co.uk',
    'eduardo@primegroup.london',
    'ahkiwan1@gmail.com',
    'info@letclub.co.uk',
    'marc.mridul@gmail.com',
    'nabeelsoroya@hotmail.com',
    'info@arcadiaresidences.co.uk',
    'info@rapidrentresidences.co.uk',
    'sirlevantine@gmail.com',
    'decosyproperty@gmail.com',
    'sales@knaresboroughboutiquehotel.co.uk',
    'host@ovitzia.com',
    'majaz@grapevinehotel.com',
    'info@theilegroup.co.uk',
    'admin@cpastay.com',
    'bg587@hotmail.com',
    'moshemoshe231@gmail.com',
    'reservations@newkentaparts.com',
    'info@cuboapartments.com',
    'info@khaanj.com',
    'info@co-host.london',
    'ats@aboutthestay.com',
    'info@stayzltd.com',
    'reservations@lamingtonapartments.com',
    'clifford@cbemanagement.co.uk',
    'feven_esu@yahoo.com',
    'emily@londonnw3.com',
    'ekz@qapartments.com',
    'studioscentra@gmail.com',
    'ad@golden-eagle.co.uk',
    'towersuites.reservations@blueorchid.com',
    'admin@baccari.co.uk',
    'admin@yourrentl.com',
    'reservations@carltoncourt.com',
    'admin@skylineukbd.co.uk',
    'lettings@cityrelay.com',
    '2203amr@gmail.com',
    'admin@westminsterapartments.co.uk',
    'pritam@1lexhamgardens.com',
    'ozan@londonvillageinns.co.uk',
    'ozan@londonvillageinns.co.uk',
    'michaelriley90@hotmail.com',
    'info@curated-property.com',
    'hello@theperfect.host',
    'andyglynne26@gmail.com',
    'hello@home.ly',
    'info@pfamhaus.com',
    'bookings@getlavanda.com',
    'roxanne@arkgroup.co.uk',
    'info@crownlawn.com',
    'reservations@theharrington.com',
    'sulamanairbnb@gmail.com',
    'nestand22@gmail.com',
    'stephan@alma-homes.com',
    'info@egre.london',
    'saldanhalodge@gmail.com',
    'creatickstay@user.guesty.com',
    'mandy@hometownspaces.co.za',
    'info@capeholidayaccommodation.com',
    'werner@victoria-properties.co.za',
    'sarishnarrandes@gmail.com',
    'info@kinesisproperty.co.za',
    'atitarenko.smm@gmail.com',
    'cro@aha.co.za',
    'yangorentals@gmail.com',
    'ops1@africaneliteproperties.com',
    'info@bgstravel.co.za',
    'shannon@shannonphillips.co.za',
    'bookings@rocklandsecoretreat.com',
    'stewart.bredenkamp@gmail.com',
    'reservations@inthecity.co.za',
    'info@gardensapartments.co.za',
    'reservations@cchotels.co.za',
    'info@right-stay.com',
    'charmaine@pulsegear.co.za',
    'gm@islandclubhotel.co.za',
    'james@prospr.management',
    'info@nox.capetown',
    'chuki_v@yahoo.com',
    'leon@singergroup.co.za',
    'info@romneypark.co.za',
    'wedopropertycapetown@gmail.com',
    'alex@northcliffcycles.co.za',
    'vipbookingcapetown@gmail.com',
    'reservations@newmarkhotels.com',
    'sleepnsoundsa@gmail.com',
    'keanuloc94@gmail.com',
    'info@phoenixvoyage.co',
    'terri@stayinluxury.co.za',
    'james@elevate.capetown',
    'khomotsoklee@gmail.com',
    'zeena@citystay.co.za',
    'anja@capeheritage.co.za',
    'nadja@lpoh.villas',
    'tylkosteph@gmail.com',
    'melani@awesomestays.co.za',
    'stay@theatlanticaffair.co.za',
    'reservations@pepperclub.co.za',
    'mojalefagmosia123@gmail.com',
    'reservations@motivespaceza.com',
    'homenextdoorct@gmail.com',
    'capepalmroyalguesthouse@gmail.com',
    'janinegruter@gvj.co.za',
    'amber@ikeja.co.za',
    'lemcevoy@gmail.com',
    'info@aubergecape.co.za',
    'reservations.mnh@belmond.com',
    'tony.capetown@gmail.com',
    'niles@urbanelephant.co.za',
    'stay@campsbayblue.co.za',
    'admin@closerealty.co.za',
    'enquiries@housesofnomad.com',
    'iconicspacesjc@gmail.com',
    'bdc@villagenlife.travel',
    'stoked@krystalwaters.co.za',
    'emiunuogorugba@gmail.com',
    'info@tophostprop.com',
    'hello@propati.co.za',
    'bookings@totalstay.co.za',
    'cailin.wilmore@engelvoelkers.com',
    'chandosprop@gmail.com',
    'stayblissfulct@gmail.com',
    'mellisag8@gmail.com',
    'lwdistributions@gmail.com',
    'colinplit@gmail.com',
    'gina@tpfhospitality.com',
    'info@starapartments.co.za',
    'bookings@propr.co.za',
    'info@bayviewpenthouses.co.za',
    'marc@toastsouthafrica.com',
    'info@capestandard.co.za',
    'gailreid5@gmail.com',
    'info@zals.co.za',
    'connect@meetluxuria.co.za',
    'efreddi69@yohoo.it',
    'info@5campstreet.co.za',
    'info@authentictravel.co.za',
    'info@wemanageprop.com',
    'roxanne@youstay.co.za',
    'kobie@chrissen.co.za',
    'barbara@staysensational.co.za',
    'murraycommins@gmail.com',
    'book@dewaterkantcottages.com',
    'gaotprop.sa@gmail.com',
    'reservations@novaconstantia.com',
    'book@hostgents.com',
    'kyle@medindiconsulting.com',
    'info@holidayhomes.capetown',
    'stay@neighbourgood.co.za',
    'bookings@perchstays.co.za',
    'ross@stayscape.co.za',
    'stay@thehalyard.co.za',
    'bookings@cptstays.com',
    'info@muistays.com',
    'keaton.korevaar@gmail.com',
    'mopanemmone@gmail.com',
    'ridhwaan@tenaciousproperty.co.za',
    'reservations@soughted.com',
    'support@thehappyhomeza.com',
    'valleyheights@mweb.co.za',
    'info@capecomfortstays.com',
    'staycoolproperty@gmail.com',
    'hplanting19@gmail.com',
    'bheki@curiociy.africa',
    'bookings@stayamazing.co.za',
    'nicole@scoutcapetown.co.za',
    'thecraftedescape@gmail.com',
    'heinz@tablebay.co.za',
    'cvista@iafrica.com',
    'doreen@inawestays.co.za',
    'tessa@tfwcc.net',
    'waleed@potere.co.za',
    'markus.bolinder@gmail.com',
    'nathan@property-management.co.za',
    'haddonj@gmail.com',
    'deblauwvoet30@gmail.com',
    'jayson@otwo.co.za',
    'reservations@themojohotel.com',
    'askbelvedere@gmail.com',
    'jeanpaulkrooneman@gmail.com',
    'jaco@hotel-revenue-manager.com',
    'farnaaz.kzn@beprop.co.za',
    'info@surfhostel.com',
    'craig@fluentliving.com',
    'kalana.tam@gmail.com',
    'rene@merakicountrymanor.co.za',
    'bookings@yolospaces.com',
    'relax@feelingagain.co.za',
    'roland@innes.com',
    'lara.pascale@yahoo.co.za',
    'enquiries@atlanticmarina.com',
    'jatroskie@gmail.com',
    'info@purplehouse.co.za',
    'krispotgieter@gmail.com',
    'elana@lastay.co.za',
    'bookings@greatxcape.com',
    'mogalet360@gmail.com',
    'enquiries@thecapecollective.co.za',
    'superhosts@aircnc.co.za',
    'info@ezevee.co.za',
    'sucasa367@iafrica.com',
    'redcactusptyltd@gmail.com',
    'bookings@bradclin.com',
    'info@bayreflections.com',
    'info@stayincapetown.co.za',
    'host@likwidproperties.com',
    'exquize.events@gmail.com',
    'hello@iconicstays.co.za',
    'charmainegoott@hotmail.com',
    'info@openhome.co.za',
    'info@capeeazistayz.co.za',
    'philjoen@gmail.com',
    'adrianfunkey@me.com',
    'bookings@capefinest.co.za',
    'cathrorbye@hotmail.com',
    'info@mountainmanor.co.za',
    'info@sunsetresidence.co.za',
    'villaonoceanview@gmail.com',
    'aviva@blacksheep-cpt.co.za',
    'thandostehlik@gmail.com',
    'sam@projoystays.co.za',
    'contact@cozy.capetown',
    'calvin@living-hotels.com',
    'samseapoint40@gmail.com',
    'bookings@kelvincottage.co.za',
    'themsvrservs@gmail.com',
    'bookings@capehillsandoceanviewsapartments.com',
    'dynamicmanage@gmail.com',
    'belinda@capebreaks.co.za',
    'mmlunjwa@gmail.com',
    'ctlofts@iafrica.com',
    'bookings@turnkey365.co.za',
    'stay@bluegumhill.co.za',
    'almahorn@gmail.com',
    'info@129onkloofnek.com',
    'murex@shelllodges.co.za',
    'manandtree@hotmail.com',
    'fullybookedairbnb@gmail.com',
    'mystay@ctha.co.za',
    'avatar@mweb.co.za',
    'silversp@global.co.za',
    'stay@koenengprop.com',
    'rio.guestaccommodation@gmail.com',
    'booking@lykkeliving.co',
    'hello@binfiniti.co.za',
    'property@achilleuscapital.co.za',
    'info@82onregent.com',
    'nasmodien@oldmutual.com',
    'gurutoursoffice@gmail.com',
    'armand.botha@yahoo.com',
    'kikiloubser@gmail.com',
    'irenekalapwe@gmail.com',
    'info@micasa-pm.com',
    'leeannehodson@gmail.com',
    'capetownluxurystays@gmail.com',
    'sherna@accommodationshop.co.za',
    'pauline@remaxpa.co.za',
    'panoramagh@gmail.com',
    'joe@dwellpropman.com',
    'chuchulerabo@gmail.com',
    'mphochanel@gmail.com',
    'taj906ct@gmail.com',
    'craig@trilogyproperty.co.za',
    'gm@lagoonbeachhotel.co.za',
    'info@lagoonshorelinepenthouse.co.za',
]

// Fonction pour lire les URLs du fichier
function readUrlsFromFile(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    return content.split('\n').filter(url => url.trim() !== '');
}

// Fonction pour sauvegarder un résultat dans le CSV progressivement
function saveResultToCSV(result, isFirst = false) {
    // Vérifier si l'email est dans la blacklist
    if (result.email && EMAIL_BLACKLIST.includes(result.email.toLowerCase())) {
        console.log(`🚫 Skipping blacklisted email: ${result.email}`);
        return; // Ne pas sauvegarder si l'email est blacklisté
    }

    const csvLine = `"${result.url}","${result.businessName || ''}","${result.address || ''}","${result.email || ''}","${result.phone || ''}","${result.registerNumber || ''}","${result.scrapedAt}","${result.error || ''}"`;

    if (isFirst) {
        // Créer le fichier avec l'en-tête
        const csvHeader = 'url,businessName,address,email,phone,registerNumber,scrapedAt,error\n';
        fs.writeFileSync('legal-results-simple.csv', csvHeader + csvLine + '\n');
    } else {
        // Ajouter à la fin du fichier
        fs.appendFileSync('legal-results-simple.csv', csvLine + '\n');
    }

    // Sauvegarder aussi en JSON progressivement
    let allResults = [];
    if (fs.existsSync('legal-results-simple.json')) {
        try {
            const existingData = fs.readFileSync('legal-results-simple.json', 'utf8');
            allResults = JSON.parse(existingData);
        } catch (error) {
            console.log('⚠️ Error reading existing JSON, starting fresh');
        }
    }

    allResults.push(result);
    fs.writeFileSync('legal-results-simple.json', JSON.stringify(allResults, null, 2));
}

// Fonction pour scraper une URL individuelle
async function scrapeSingleUrl(url, browser, index, total) {
    let page = null;
    try {
        page = await browser.newPage();

        console.log(`🌐 Processing ${index + 1}/${total}: ${url}`);

        // 1. Aller sur la page
        console.log('Navigating to Booking.com page...');
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Attendre que la page soit chargée
        await page.waitForTimeout(3000);

        // 2. Identifier et cliquer sur le bouton "See business details"
        console.log('Looking for "See business details" button...');

        try {
            // Attendre que le bouton soit visible
            await page.waitForSelector('[data-testid="trader-information-modal-button"]', { timeout: 10000 });

            // Cliquer sur le bouton
            console.log('Clicking on "See business details" button...');
            await page.click('[data-testid="trader-information-modal-button"]');

            // 3. Attendre que la modale apparaisse
            console.log('Waiting for modal to appear...');
            await page.waitForSelector('[data-testid="trader-information-modal"]', { timeout: 10000 });

            // Attendre un peu pour que la modale soit complètement chargée
            await page.waitForTimeout(2000);

            // 4. Cliquer sur le bouton "Business details" pour déployer les informations
            console.log('Looking for "Business details" expand button...');
            await page.waitForSelector('[data-testid="show-host-detail-button"]', { timeout: 10000 });

            console.log('Clicking on "Business details" expand button...');
            await page.click('[data-testid="show-host-detail-button"]');

            // Attendre que les détails se déploient
            await page.waitForTimeout(2000);

            // 5. Récupérer les informations
            console.log('Extracting business information...');

            const businessInfo = await page.evaluate(() => {
                const modal = document.querySelector('[data-testid="trader-information-modal"]');
                if (!modal) return null;

                // Récupérer l'email
                const emailElement = modal.querySelector('[data-testid="host-details-email"]');
                const email = emailElement ? emailElement.textContent.trim() : null;

                // Récupérer le téléphone
                const phoneElement = modal.querySelector('[data-testid="host-details-phone"]');
                const phone = phoneElement ? phoneElement.textContent.trim() : null;

                // Récupérer l'adresse simplement
                let address = null;
                const firstDiv = modal.querySelector('div > div');

                if (firstDiv) {
                    // Chercher spécifiquement le div qui contient les informations de contact
                    const contactDiv = modal.querySelector('div > div > div');
                    if (contactDiv) {
                        // Récupérer le contenu HTML et remplacer les <br> par des sauts de ligne
                        const html = contactDiv.innerHTML;
                        const textWithBreaks = html.replace(/<br\s*\/?>/gi, '\n');
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = textWithBreaks;
                        const text = tempDiv.textContent;

                        const lines = text.split('\n').filter(line => line.trim());

                        if (lines.length >= 2) {
                            // L'adresse est la deuxième ligne (après le nom de l'entreprise)
                            address = lines[1].trim();
                        }
                    }
                }

                // Récupérer le numéro de registre du commerce
                let registerNumber = null;
                // Chercher dans le dernier div qui contient le numéro de registre
                const registerDiv = modal.querySelector('div > div > div');
                if (registerDiv) {
                    const text = registerDiv.textContent;
                    // Extraire les chiffres après le ':'
                    const registerMatch = text.match(/:\s*(\d+)/);
                    if (registerMatch) {
                        registerNumber = registerMatch[1];
                    }
                }

                // Récupérer le nom de l'entreprise (dernier élément après "Coordonnées de la société")
                let businessName = null;
                const contactDiv = modal.querySelector('div > div');
                if (contactDiv) {
                    const textContent = contactDiv.textContent;
                    // Chercher le nom après "Coordonnées de la société"
                    const match = textContent.match(/Coordonnées de la société([^.\n]+?)(?:\.|$)/);
                    if (match) {
                        businessName = match[1].trim();
                    } else {
                        // Fallback: chercher le dernier élément après le dernier <br>
                        const innerHTML = contactDiv.innerHTML;
                        const lines = innerHTML.split('<br>');
                        if (lines.length > 0) {
                            const lastLine = lines[lines.length - 1].replace(/<[^>]*>/g, '').trim();
                            if (lastLine && lastLine.length > 0 && !lastLine.includes('@') && !lastLine.includes('+')) {
                                businessName = lastLine;
                            }
                        }
                    }
                }

                return {
                    url: window.location.href,
                    businessName: businessName,
                    address: address,
                    email: email,
                    phone: phone,
                    registerNumber: registerNumber,
                    scrapedAt: new Date().toISOString()
                };
            });

            if (businessInfo) {
                console.log('✅ Success: Business information found');
                console.log(JSON.stringify(businessInfo, null, 2));
                return businessInfo;
            } else {
                console.log('❌ No business information found');
                return {
                    url: url,
                    businessName: null,
                    address: null,
                    email: null,
                    phone: null,
                    registerNumber: null,
                    scrapedAt: new Date().toISOString(),
                    error: 'No business information found'
                };
            }

        } catch (modalError) {
            console.log('❌ No legal information section found');
            return {
                url: url,
                businessName: null,
                address: null,
                email: null,
                phone: null,
                registerNumber: null,
                scrapedAt: new Date().toISOString(),
                error: 'No legal information section found'
            };
        }

    } catch (pageError) {
        console.error(`❌ Error processing ${url}:`, pageError.message);
        return {
            url: url,
            businessName: null,
            address: null,
            email: null,
            phone: null,
            registerNumber: null,
            scrapedAt: new Date().toISOString(),
            error: pageError.message
        };
    } finally {
        if (page) {
            await page.close();
        }
    }
}

async function scrapeLegalInfo() {
    const urls = readUrlsFromFile('url.txt');
    console.log(`📋 Found ${urls.length} URLs to process`);

    const browser = await puppeteer.launch({
        headless: 'new', // Pour voir ce qui se passe
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        // Limiter à 8 processus en parallèle
        const limit = pLimit(3);

        console.log('🚀 Starting parallel processing (8 at a time)...');

        let processedCount = 0;
        let successfulCount = 0;
        let failedCount = 0;
        const allResults = [];

        // Traiter les URLs par lots de 8
        const batchSize = 8;

        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);

            const batchPromises = batch.map((url, batchIndex) =>
                limit(async () => {
                    const result = await scrapeSingleUrl(url, browser, i + batchIndex, urls.length);

                    // Sauvegarder progressivement dans le CSV et JSON
                    const isFirst = (i === 0 && batchIndex === 0);
                    saveResultToCSV(result, isFirst);

                    // Mettre à jour les compteurs
                    processedCount++;

                    // Vérifier si l'email est blacklisté
                    const isBlacklisted = result.email && EMAIL_BLACKLIST.includes(result.email.toLowerCase());

                    if (isBlacklisted) {
                        console.log(`🚫 Skipping blacklisted email: ${result.email}`);
                        failedCount++; // Compter comme échec si blacklisté
                    } else if (result.businessName || result.email || result.phone || result.address) {
                        successfulCount++;
                    } else {
                        failedCount++;
                    }

                    // Afficher le progrès
                    if (processedCount % 10 === 0 || processedCount === urls.length) {
                        console.log(`📊 Progress: ${processedCount}/${urls.length} (${Math.round(processedCount / urls.length * 100)}%) - ✅ ${successfulCount} | ❌ ${failedCount}`);
                    }

                    return result;
                })
            );

            const batchResults = await Promise.all(batchPromises);
            allResults.push(...batchResults);
        }

        console.log(`\n📊 Final Summary:`);
        console.log(`📋 Total processed: ${allResults.length}`);
        console.log(`✅ Successful: ${successfulCount}`);
        console.log(`❌ Failed: ${failedCount}`);
        console.log('💾 Results saved to legal-results-simple.csv and legal-results-simple.json');

    } catch (error) {
        console.error('Error during scraping:', error);
    } finally {
        await browser.close();
    }
}

// Exécuter le scraper
scrapeLegalInfo().catch(console.error); 