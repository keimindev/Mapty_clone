'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

let map, mapEvent;

class Workout{
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration){
    this.coords = coords;
    this.distance = distance; //in km
    this.duration = duration; //in min
  }
}

class Running extends Workout{
     type = 'running';
  constructor(coords, distance, duration, cadence){
    //super은 부모오브젝트의 함수를 호출할 때 사용
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }

  calcPace(){
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace
  }



}
class Cycling extends Workout{
   type = 'cycling';
  constructor(coords, distance, duration, elevationGain){
    super(coords, distance, duration);
    this.elevationGain = elevationGain;    
    this.calcSpeed();
  }

  calcSpeed(){
    //h/km
    this.speed = this.distance / (this.duration / 60 );
    return this.speed
  }
}

const run1 = new Running([39, -12], 5.3, 24, 178)
const cycling1 = new Cycling([39, -12], 53, 24, 178)

////////////////////////////////////////////////////////
//Application architecture
class App {
  //private property
  #map; 
  #workouts = [];
  //생성자 메소드
  constructor(){
    //동적인 this를 가진다
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this)); 
    //bind는 새로운 함수를 생성한다.this keyword를 설정하고 인자들은 바인드된 함수의 인수에 제공된다.
    inputType.addEventListener('change', this._toggleElevationField);
  }

  _getPosition(){    
    if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function(){
      alert('Could not get your position')
      });
    }
  }

  _loadMap(position){

    const {latitude} = position.coords;
    const {longitude} = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);
  
    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this))
  }


  _showForm(mapE){
    this.mapEvent = mapE;
     form.classList.remove('hidden');
     inputDistance.focus();
  }

  _toggleElevationField(){
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  
  _newWorkout(e) {  
    //helper function   (...array)
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
   e.preventDefault();

   //Get data from form
   //ele value를 새로 정의주고 +는 넘버로 전환해야하기에
   const type = inputType.value;
   const distance = +inputDistance.value;
   const duration = +inputDuration.value;
   const { lat, lng } = this.mapEvent.latlng;
   let workout;
   //If activity running, create running object
   if( type === 'running' ){
     const cadence = +inputCadence.value;
    //check if data is valid 
    //일단 숫자여야함 
    if(
      // !Number.isFinite(distance) || 
      // !Number.isFinite(duration) || 
      // !Number.isFinite(cadence)
      !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) 
      return alert('Input have to be positive numbers!');
      
      //marker된 workout 내용을 보여준다. 
      workout = new Running({lat, lng}, distance, duration, cadence);

   }

   //If activity cycling, create cycling object
   if( type === 'cycling' ){
     const elevation = +inputElevation.value;
   if(!validInputs(distance, duration, elevation) || !allPositive(distance, duration) ) 
      return alert('Input have to be positive numbers!');

      workout = new Cycling ({lat, lng}, distance, duration, elevation);
   }

   //Add new object to workout array
    this.#workouts.push(workout);
    console.log(workout)
   //Render workout on map as market
   this.renderWorkoutMarker(workout);
   //Render workout on list


   //Hide form + clear input fields
   inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";

  }

  //workout 내용물이 인자 
  renderWorkoutMarker(workout){
   //Render workout on map as market
  //Display marker
    L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }))
        //marker부분에 뜨는 내용
        .setPopupContent('workout')
        .openPopup(); 

  }
}


const app = new App();



