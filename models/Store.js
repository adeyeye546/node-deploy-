const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply address!'

    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  }
}, {
  toJSON: { virtuals: true},
  toObject: {virtuals: true},
});

//Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({ location: '2dsphere'});

storeSchema.pre('save', async function(next) {
if (!this.isModified('name')) {
  next();
  return;
}
  this.slug = slug(this.name);

  // find other stores that has a slug of wes, wes-1, wes-2
  const slugRegEx = new RegExp(`^(${this.slug}((-[0-9]*$)?)$)`, 'i');
  const storeWithSlug = await this.constructor.find({ slug: slugRegEx});
  if (storeWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();

  //TODO make more resilient so slugs are unique

});
storeSchema.statics.getTagsList = function (){
  return this.aggregate([
    { $unwind: '$tags'},
    { $group: { _id: '$tags', count: { $sum: 1}}},
    { $sort: { count: -1 }}
  ]);
};

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    { $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews'}},
    { $match: { 'reviews.1': { $exists: true}}},
    { $project: {
      photo: '$$ROOT.photo',
      name: '$$ROOT.name',
      reviews: '$$ROOT.reviews',
      slug: '$$ROOT.slug',
      averageRating: { $avg: '$reviews.rating'}
    }},
    { $sort: { averageRating: -1}},
    { $limit: 10 }

  ]);
}

storeSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id', //which field on the store
  foreignField: 'store' //which field on the review
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
