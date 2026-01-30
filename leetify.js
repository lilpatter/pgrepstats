
window.onload = function() {
  // Build a system
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  var options = {
  "swaggerDoc": {
    "openapi": "3.1.0",
    "info": {
      "title": "Leetify Public CS API",
      "description": "Leetify Public CS API aligns with the privacy settings from the main Leetify Product APIs.\n\nBy using the public API, you agree to adhere to our [Developer Guidelines](https://leetify.com/blog/leetify-api-developer-guidelines/)\n\n### Obtaining API Key\n\nDevelopers need to sign their requests with an API key which can be obtained at [leetify.com/app/developer](https://leetify.com/app/developer). The API key should be passed as the value for either the `Authorization` or `_leetify_key` header. While it is possible to use the API without a key, such requests will be subject to increased rate limits.\n\nYou can validate your API key by making a GET request to `/api-key/validate` with your key in the `Authorization`, with the value `Bearer <key>`, or `_leetify_key` header. The endpoint will return:\n- 200 status if the key is valid\n- 401 status if the key is invalid or missing\n- 500 status if there was a server error\n"
    },
    "servers": [
      {
        "url": "https://api-public.cs-prod.leetify.com",
        "description": "Prod"
      }
    ],
    "components": {
      "schemas": {
        "ProfileResponse": {
          "type": "object",
          "example": {
            "privacy_mode": "public",
            "winrate": 0.6429,
            "total_matches": 2361,
            "first_match_date": "2020-01-01T19:08:39.000Z",
            "name": "Slinky",
            "bans": [
              {
                "platform": "faceit",
                "platform_nickname": "extrasense",
                "banned_since": "2022-10-17T13:26:12.018Z"
              }
            ],
            "steam64_id": "76561197969209908",
            "id": "e50a982e-d8ec-4627-996f-017ed9d7162e",
            "ranks": {
              "leetify": 2.12,
              "premier": 19309,
              "faceit": 9,
              "faceit_elo": null,
              "wingman": 17,
              "renown": 16482,
              "competitive": [
                {
                  "map_name": "de_nuke",
                  "rank": 14
                },
                {
                  "map_name": "de_mills",
                  "rank": 0
                }
              ]
            },
            "rating": {
              "aim": 60.2568,
              "positioning": 57.1424,
              "utility": 70.1944,
              "clutch": 0.0938,
              "opening": -0.0024,
              "ct_leetify": 0.0176,
              "t_leetify": 0.0248
            },
            "stats": {
              "accuracy_enemy_spotted": 34.3927,
              "accuracy_head": 18.0232,
              "counter_strafing_good_shots_ratio": 80.7065,
              "ct_opening_aggression_success_rate": 36.9767,
              "ct_opening_duel_success_percentage": 42.4699,
              "flashbang_hit_foe_avg_duration": 3.0482,
              "flashbang_hit_foe_per_flashbang": 0.7055,
              "flashbang_hit_friend_per_flashbang": 0.3976,
              "flashbang_leading_to_kill": 12.7502,
              "flashbang_thrown": 14.5015,
              "he_foes_damage_avg": 7.4804,
              "he_friends_damage_avg": 0.6348,
              "preaim": 12.0408,
              "reaction_time_ms": 586.7643,
              "spray_accuracy": 37.0909,
              "t_opening_aggression_success_rate": 43.4608,
              "t_opening_duel_success_percentage": 49.8248,
              "traded_deaths_success_percentage": 51.5246,
              "trade_kill_opportunities_per_round": 0.3223,
              "trade_kills_success_percentage": 45.8348,
              "utility_on_death_avg": 152.9369
            },
            "recent_matches": [
              {
                "id": "f78ae802-9044-4aa1-be47-d8e0193c4bd7",
                "finished_at": "2025-07-02T21:06:50.000Z",
                "data_source": "renown",
                "outcome": "win",
                "rank": 0,
                "rank_type": null,
                "map_name": "de_inferno",
                "leetify_rating": -0.0014,
                "score": [
                  13,
                  6
                ],
                "preaim": 11.22,
                "reaction_time_ms": 664,
                "accuracy_enemy_spotted": 35.59,
                "accuracy_head": 19.64,
                "spray_accuracy": 30
              }
            ],
            "recent_teammates": [
              {
                "steam64_id": "76561197989048400",
                "recent_matches_count": 35
              },
              {
                "steam64_id": "76561197975803008",
                "recent_matches_count": 42
              }
            ]
          },
          "properties": {
            "privacy_mode": {
              "type": "string"
            },
            "winrate": {
              "type": "number"
            },
            "total_matches": {
              "type": "number"
            },
            "first_match_date": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "name": {
              "type": "string"
            },
            "bans": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/PlatformBanInfo"
              }
            },
            "steam64_id": {
              "type": "string"
            },
            "id": {
              "type": "string",
              "nullable": true
            },
            "ranks": {
              "$ref": "#/components/schemas/Ranks"
            },
            "rating": {
              "$ref": "#/components/schemas/Rating"
            },
            "stats": {
              "$ref": "#/components/schemas/Stats"
            },
            "recent_matches": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/RecentMatch"
              }
            },
            "recent_teammates": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/RecentTeammate"
              }
            }
          }
        },
        "Ranks": {
          "type": "object",
          "properties": {
            "leetify": {
              "type": "number",
              "nullable": true
            },
            "premier": {
              "type": "number",
              "nullable": true
            },
            "faceit": {
              "type": "number",
              "nullable": true
            },
            "faceit_elo": {
              "type": "number",
              "nullable": true
            },
            "wingman": {
              "type": "number",
              "nullable": true
            },
            "renown": {
              "type": "number",
              "nullable": true
            },
            "competitive": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/CompetitiveRank"
              }
            }
          }
        },
        "CompetitiveRank": {
          "type": "object",
          "properties": {
            "map_name": {
              "type": "string"
            },
            "rank": {
              "type": "number"
            }
          }
        },
        "Rating": {
          "type": "object",
          "properties": {
            "aim": {
              "type": "number"
            },
            "positioning": {
              "type": "number"
            },
            "utility": {
              "type": "number"
            },
            "clutch": {
              "type": "number"
            },
            "opening": {
              "type": "number"
            },
            "ct_leetify": {
              "type": "number"
            },
            "t_leetify": {
              "type": "number"
            }
          }
        },
        "Stats": {
          "type": "object",
          "properties": {
            "accuracy_enemy_spotted": {
              "type": "number"
            },
            "accuracy_head": {
              "type": "number"
            },
            "counter_strafing_good_shots_ratio": {
              "type": "number"
            },
            "ct_opening_aggression_success_rate": {
              "type": "number"
            },
            "ct_opening_duel_success_percentage": {
              "type": "number"
            },
            "flashbang_hit_foe_avg_duration": {
              "type": "number"
            },
            "flashbang_hit_foe_per_flashbang": {
              "type": "number"
            },
            "flashbang_hit_friend_per_flashbang": {
              "type": "number"
            },
            "flashbang_leading_to_kill": {
              "type": "number"
            },
            "flashbang_thrown": {
              "type": "number"
            },
            "he_foes_damage_avg": {
              "type": "number"
            },
            "he_friends_damage_avg": {
              "type": "number"
            },
            "preaim": {
              "type": "number"
            },
            "reaction_time_ms": {
              "type": "number"
            },
            "spray_accuracy": {
              "type": "number"
            },
            "t_opening_aggression_success_rate": {
              "type": "number"
            },
            "t_opening_duel_success_percentage": {
              "type": "number"
            },
            "traded_deaths_success_percentage": {
              "type": "number"
            },
            "trade_kill_opportunities_per_round": {
              "type": "number"
            },
            "trade_kills_success_percentage": {
              "type": "number"
            },
            "utility_on_death_avg": {
              "type": "number"
            }
          }
        },
        "RecentMatch": {
          "type": "object",
          "example": {
            "id": "match123",
            "finished_at": "2023-12-01T15:30:00Z",
            "data_source": "CS_API",
            "outcome": "win",
            "rank": 14,
            "rank_type": "matchmaking",
            "map_name": "de_dust2",
            "leetify_rating": 85,
            "score": [
              16,
              12
            ],
            "preaim": 0.75,
            "reaction_time_ms": 180,
            "accuracy_enemy_spotted": 0.68,
            "accuracy_head": 0.48,
            "spray_accuracy": 0.71
          },
          "properties": {
            "id": {
              "type": "string"
            },
            "finished_at": {
              "type": "string",
              "format": "date-time"
            },
            "data_source": {
              "type": "string"
            },
            "outcome": {
              "type": "string"
            },
            "rank": {
              "type": "number"
            },
            "rank_type": {
              "type": "string"
            },
            "map_name": {
              "type": "string"
            },
            "leetify_rating": {
              "type": "number"
            },
            "score": {
              "type": "array",
              "items": {
                "type": "number"
              },
              "minItems": 2,
              "maxItems": 2
            },
            "preaim": {
              "type": "number"
            },
            "reaction_time_ms": {
              "type": "number"
            },
            "accuracy_enemy_spotted": {
              "type": "number"
            },
            "accuracy_head": {
              "type": "number"
            },
            "spray_accuracy": {
              "type": "number"
            }
          }
        },
        "RecentTeammate": {
          "type": "object",
          "properties": {
            "steam64_id": {
              "type": "string"
            },
            "recent_matches_count": {
              "type": "number"
            }
          }
        },
        "PlatformBanInfo": {
          "type": "object",
          "properties": {
            "platform": {
              "type": "string"
            },
            "platform_nickname": {
              "type": "string"
            },
            "banned_since": {
              "type": "string",
              "format": "date-time"
            }
          },
          "required": [
            "platform",
            "platform_nickname",
            "banned_since"
          ]
        },
        "MatchDetailsResponse": {
          "type": "object",
          "example": {
            "id": "e30ce267-5b26-48ac-8ad5-68d97a53884b",
            "finished_at": "2025-04-15T11:58:52.000Z",
            "data_source": "matchmaking",
            "data_source_match_id": "CSGO-CQNLr-6sp23-JwjmS-kQPwR-tm7SA",
            "map_name": "de_nuke",
            "has_banned_player": true,
            "team_scores": [
              {
                "team_number": 2,
                "score": 3
              },
              {
                "team_number": 3,
                "score": 13
              }
            ],
            "stats": [
              {
                "steam64_id": "76561199536301058",
                "name": "reaxl",
                "mvps": 6,
                "preaim": 12.2612,
                "reaction_time": 0.5938,
                "accuracy": 0.3641,
                "accuracy_enemy_spotted": 0.5446,
                "accuracy_head": 0.2429,
                "shots_fired_enemy_spotted": 112,
                "shots_fired": 195,
                "shots_hit_enemy_spotted": 61,
                "shots_hit_friend": 0,
                "shots_hit_friend_head": 0,
                "shots_hit_foe": 71,
                "shots_hit_foe_head": 0,
                "utility_on_death_avg": 237.5,
                "he_foes_damage_avg": 5.6667,
                "he_friends_damage_avg": 0,
                "he_thrown": 3,
                "molotov_thrown": 5,
                "smoke_thrown": 1,
                "counter_strafing_shots_all": 94,
                "counter_strafing_shots_bad": 8,
                "counter_strafing_shots_good": 86,
                "counter_strafing_shots_good_ratio": 0.9149,
                "flashbang_hit_foe": 2,
                "flashbang_leading_to_kill": 0,
                "flashbang_hit_foe_avg_duration": 3.1212,
                "flashbang_hit_friend": 3,
                "flashbang_thrown": 8,
                "flash_assist": 0,
                "score": 58,
                "initial_team_number": 3,
                "spray_accuracy": 0.4773,
                "total_kills": 26,
                "total_deaths": 8,
                "kd_ratio": 3.25,
                "rounds_survived": 8,
                "rounds_survived_percentage": 0.5,
                "dpr": 160.81,
                "total_assists": 3,
                "total_damage": 2573,
                "leetify_rating": 0.1232,
                "ct_leetify_rating": 0.0971,
                "t_leetify_rating": 0.2014,
                "multi1k": 5,
                "multi2k": 4,
                "multi3k": 3,
                "multi4k": 1,
                "multi5k": 0,
                "rounds_count": 16,
                "rounds_won": 13,
                "rounds_lost": 3,
                "total_hs_kills": 16,
                "trade_kill_opportunities": 7,
                "trade_kill_attempts": 6,
                "trade_kills_succeed": 3,
                "trade_kill_attempts_percentage": 0.8571,
                "trade_kills_success_percentage": 0.5,
                "trade_kill_opportunities_per_round": 0.3182,
                "traded_death_opportunities": 8,
                "traded_death_attempts": 7,
                "traded_deaths_succeed": 4,
                "traded_death_attempts_percentage": 0.875,
                "traded_deaths_success_percentage": 0.5714,
                "traded_deaths_opportunities_per_round": 0.3636
              }
            ]
          },
          "properties": {
            "id": {
              "type": "string"
            },
            "finished_at": {
              "type": "string",
              "format": "date-time"
            },
            "data_source": {
              "type": "string"
            },
            "data_source_match_id": {
              "type": "string"
            },
            "map_name": {
              "type": "string"
            },
            "has_banned_player": {
              "type": "boolean"
            },
            "team_scores": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/TeamScore"
              },
              "minItems": 2,
              "maxItems": 2
            },
            "stats": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/PlayerStats"
              }
            }
          }
        },
        "TeamScore": {
          "type": "object",
          "properties": {
            "team_number": {
              "type": "number"
            },
            "score": {
              "type": "number"
            }
          }
        },
        "PlayerStats": {
          "type": "object",
          "properties": {
            "steam64_id": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "mvps": {
              "type": "number"
            },
            "preaim": {
              "type": "number"
            },
            "reaction_time": {
              "type": "number"
            },
            "accuracy": {
              "type": "number"
            },
            "accuracy_enemy_spotted": {
              "type": "number"
            },
            "accuracy_head": {
              "type": "number"
            },
            "shots_fired_enemy_spotted": {
              "type": "number"
            },
            "shots_fired": {
              "type": "number"
            },
            "shots_hit_enemy_spotted": {
              "type": "number"
            },
            "shots_hit_friend": {
              "type": "number"
            },
            "shots_hit_friend_head": {
              "type": "number"
            },
            "shots_hit_foe": {
              "type": "number"
            },
            "shots_hit_foe_head": {
              "type": "number"
            },
            "utility_on_death_avg": {
              "type": "number"
            },
            "he_foes_damage_avg": {
              "type": "number"
            },
            "he_friends_damage_avg": {
              "type": "number"
            },
            "he_thrown": {
              "type": "number"
            },
            "molotov_thrown": {
              "type": "number"
            },
            "smoke_thrown": {
              "type": "number"
            },
            "counter_strafing_shots_all": {
              "type": "number"
            },
            "counter_strafing_shots_bad": {
              "type": "number"
            },
            "counter_strafing_shots_good": {
              "type": "number"
            },
            "counter_strafing_shots_good_ratio": {
              "type": "number"
            },
            "flashbang_hit_foe": {
              "type": "number"
            },
            "flashbang_leading_to_kill": {
              "type": "number"
            },
            "flashbang_hit_foe_avg_duration": {
              "type": "number"
            },
            "flashbang_hit_friend": {
              "type": "number"
            },
            "flashbang_thrown": {
              "type": "number"
            },
            "flash_assist": {
              "type": "number"
            },
            "score": {
              "type": "number"
            },
            "initial_team_number": {
              "type": "number"
            },
            "spray_accuracy": {
              "type": "number"
            },
            "total_kills": {
              "type": "number"
            },
            "total_deaths": {
              "type": "number"
            },
            "kd_ratio": {
              "type": "number"
            },
            "rounds_survived": {
              "type": "number"
            },
            "rounds_survived_percentage": {
              "type": "number"
            },
            "dpr": {
              "type": "number"
            },
            "total_assists": {
              "type": "number"
            },
            "total_damage": {
              "type": "number"
            },
            "leetify_rating": {
              "type": "number",
              "nullable": true
            },
            "ct_leetify_rating": {
              "type": "number",
              "nullable": true
            },
            "t_leetify_rating": {
              "type": "number",
              "nullable": true
            },
            "multi1k": {
              "type": "number"
            },
            "multi2k": {
              "type": "number"
            },
            "multi3k": {
              "type": "number"
            },
            "multi4k": {
              "type": "number"
            },
            "multi5k": {
              "type": "number"
            },
            "rounds_count": {
              "type": "number"
            },
            "rounds_won": {
              "type": "number"
            },
            "rounds_lost": {
              "type": "number"
            },
            "total_hs_kills": {
              "type": "number"
            },
            "trade_kill_opportunities": {
              "type": "number"
            },
            "trade_kill_attempts": {
              "type": "number"
            },
            "trade_kills_succeed": {
              "type": "number"
            },
            "trade_kill_attempts_percentage": {
              "type": "number"
            },
            "trade_kills_success_percentage": {
              "type": "number"
            },
            "trade_kill_opportunities_per_round": {
              "type": "number"
            },
            "traded_death_opportunities": {
              "type": "number"
            },
            "traded_death_attempts": {
              "type": "number"
            },
            "traded_deaths_succeed": {
              "type": "number"
            },
            "traded_death_attempts_percentage": {
              "type": "number"
            },
            "traded_deaths_success_percentage": {
              "type": "number"
            },
            "traded_deaths_opportunities_per_round": {
              "type": "number"
            }
          }
        }
      }
    },
    "paths": {
      "/v3/profile": {
        "get": {
          "tags": [
            "player"
          ],
          "summary": "Get player profile",
          "parameters": [
            {
              "name": "steam64_id",
              "in": "query",
              "description": "Steam64 ID of the player",
              "required": false,
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "id",
              "in": "query",
              "description": "Leetify User ID",
              "required": false,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "OK",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/ProfileResponse"
                  }
                }
              }
            }
          }
        }
      },
      "/v3/profile/matches": {
        "get": {
          "tags": [
            "player"
          ],
          "summary": "Get player match history",
          "parameters": [
            {
              "name": "steam64_id",
              "in": "query",
              "description": "Steam64 ID of the player",
              "required": false,
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "id",
              "in": "query",
              "description": "Leetify User ID",
              "required": false,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "OK",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/MatchDetailsResponse"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/v2/matches/{gameId}": {
        "get": {
          "tags": [
            "matches"
          ],
          "summary": "Get match details by game ID",
          "parameters": [
            {
              "name": "gameId",
              "in": "path",
              "description": "Game ID",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "OK",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/MatchDetailsResponse"
                  }
                }
              }
            }
          }
        }
      },
      "/v2/matches/{dataSource}/{dataSourceId}": {
        "get": {
          "tags": [
            "matches"
          ],
          "summary": "Get match details by data source and data source ID",
          "parameters": [
            {
              "name": "dataSource",
              "in": "path",
              "description": "Data source (e.g., faceit, matchmaking)",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "dataSourceId",
              "in": "path",
              "description": "Data source specific match ID",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "OK",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/MatchDetailsResponse"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "customOptions": {}
};
  url = options.swaggerUrl || url
  var urls = options.swaggerUrls
  var customOptions = options.customOptions
  var spec1 = options.swaggerDoc
  var swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (var attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  var ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.oauth) {
    ui.initOAuth(customOptions.oauth)
  }

  if (customOptions.preauthorizeApiKey) {
    const key = customOptions.preauthorizeApiKey.authDefinitionKey;
    const value = customOptions.preauthorizeApiKey.apiKeyValue;
    if (!!key && !!value) {
      const pid = setInterval(() => {
        const authorized = ui.preauthorizeApiKey(key, value);
        if(!!authorized) clearInterval(pid);
      }, 500)

    }
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }

  window.ui = ui
}
