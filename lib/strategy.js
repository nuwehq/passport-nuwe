/**
 * Module dependencies.
 */
var util = require('util')
  , OAuth2Strategy = require('passport-oauth2')
  , Profile = require('./profile')
  , InternalOAuthError = require('passport-oauth2').InternalOAuthError
  , APIError = require('./errors/apierror');


/**
 * `Strategy` constructor.
 *
 * The nuwe authentication strategy authenticates requests by delegating to
 * nuwe using the OAuth 2.0 protocol.
 *
 * Applications must supply a `verify` callback which accepts an `accessToken`,
 * `refreshToken` and service-specific `profile`, and then calls the `done`
 * callback supplying a `user`, which should be set to `false` if the
 * credentials are not valid.  If an exception occured, `err` should be set.
 *
 * Options:
 *   - `clientID`      your nuwe application's client id
 *   - `clientSecret`  your nuwe application's client secret
 *   - `callbackURL`   URL to which nuwe will redirect the user after granting authorization
 *
 * Examples:
 *
 *     passport.use(new NuweStrategy({
 *         clientID: '123-456-789',
 *         clientSecret: 'shhh-its-a-secret'
 *         callbackURL: 'https://www.example.net/auth/nuwe/callback'
 *       },
 *       function(accessToken, refreshToken, profile, done) {
 *         User.findOrCreate(..., function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
  options = options || {};
  // http://groups.google.com/group/nuwe-api/browse_thread/thread/86b0da52134c1b7e
  options.authorizationURL = options.authorizationURL || 'https://api.nuapi.co/oauth/authorize?';
  options.tokenURL = options.tokenURL || 'https://api.nuapi.co/authorization/token';

  OAuth2Strategy.call(this, options, verify);
  this.name = 'nuwe';
  this._userProfileURL = options.userProfileURL || 'https://api.nuapi.co/authorization.json';
}

/**
 * Inherit from `OAuth2Strategy`.
 */
util.inherits(Strategy, OAuth2Strategy);


/**
 * Retrieve user profile from nuwe.
 *
 * This function constructs a normalized profile, with the following properties:
 *
 *   - `provider`         always set to `nuwe`
 *   - `id`
 *   - `username`
 *   - `displayName`
 *
 * @param {String} accessToken
 * @param {Function} done
 * @api protected
 */
Strategy.prototype.userProfile = function(accessToken, done) {
  this._oauth2.get(this._userProfileURL, accessToken, function (err, body, res) {
    var json;
    
    if (err) {
      if (err.data) {
        try {
          json = JSON.parse(err.data);
        } catch (_) {}
      }
      
      if (json && json.error && typeof json.error == 'string') {
        return done(new APIError(json.error));
      }
      return done(new InternalOAuthError('Failed to fetch user profile', err));
    }

    try {
      json = JSON.parse(body);
    } catch (ex) {
      return done(new Error('Failed to parse user profile'));
    }
    
    var profile = Profile.parse(json);
    profile.provider  = 'nuwe';
    profile._raw = body;
    profile._json = json;
    
    done(null, profile);
  });
};

/**
 * Return extra parameters to be included in the authorization request.
 *
 * Adds type=web_server to params
 *
 * @return {Object} params
 */
Strategy.prototype.authorizationParams = function() {
  return { type: 'web_server' };
};

/**
 * Return extra parameters to be included in the token request.
 *
 * Adds type=web_server to params
 *
 * @return {Object} params
 */
Strategy.prototype.tokenParams = function() {
  return { type: 'web_server' };
};

/**
 * Parse error response from nuwe OAuth 2.0 token endpoint.
 *
 * @param {String} body
 * @param {Number} status
 * @return {Error}
 * @api protected
 */
Strategy.prototype.parseErrorResponse = function(body, status) {
  var json = JSON.parse(body);
  if (json.error && typeof json.error == 'string' && !json.error_description) {
    return new APIError(json.error);
  }
  return OAuth2Strategy.prototype.parseErrorResponse.call(this, body, status);
};


/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
