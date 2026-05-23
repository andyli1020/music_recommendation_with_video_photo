window.SHARE_DATA = {
  "meta": {
    "project_name": "视界伴音",
    "subtitle": "视觉场景感知的音乐推荐系统",
    "generated_at": "2026-05-03T11:49:30+08:00",
    "top_k": 10,
    "songs_count": 28356,
    "share_mode": "static-demo",
    "notes": [
      "这是静态分享版页面，适合直接发给朋友预览。",
      "页面内展示的是预生成推荐结果，不依赖 Flask 服务。",
      "若需实时上传图片推理，请继续使用原 Flask 应用。"
    ]
  },
  "scenes": [
    {
      "id": "cafe",
      "label": "咖啡厅",
      "icon": "☕",
      "description": "咖啡厅 / 安静放松、轻社交、轻度工作",
      "prototype_tags": [
        "indoor",
        "urban",
        "cozy",
        "semi-social",
        "soft-light"
      ],
      "recommendation_reason": "该场景warmth高(0.78)、urban高(0.75)、relaxation高(0.72)，推荐提升 valence，偏柔和舒适风格、提升 pop、r&b、edm、rap 倾向、降低节奏感，提升 acousticness的歌曲，最接近原型场景「cafe」",
      "attribute_scores": {
        "arousal": 0.35,
        "socialness": 0.55,
        "focus": 0.45,
        "relaxation": 0.72,
        "nature": 0.05,
        "urban": 0.75,
        "night": 0.2,
        "openness": 0.3,
        "warmth": 0.78
      },
      "attribute_summary": [
        {
          "attribute": "warmth",
          "score": 0.78,
          "description": "温暖亲和感。越高表示越舒适、柔和、有人情味。",
          "music_effect_hint": "提升 valence，偏柔和舒适风格"
        },
        {
          "attribute": "urban",
          "score": 0.75,
          "description": "都市感/人造环境感。越高表示越偏城市、商业、建筑和夜生活氛围。",
          "music_effect_hint": "提升 pop、r&b、edm、rap 倾向"
        },
        {
          "attribute": "relaxation",
          "score": 0.72,
          "description": "放松感/舒缓感。越高表示越柔和、越适合休息与慢节奏陪伴。",
          "music_effect_hint": "降低节奏感，提升 acousticness"
        }
      ],
      "feature_importance": {
        "danceability": 0.126005,
        "energy": 0.101877,
        "acousticness": 0.224665,
        "instrumentalness": 0.17319,
        "valence": 0.256836,
        "tempo_norm": 0.117426
      },
      "genre_priors": {
        "r&b": 0.5635,
        "pop": 0.3995,
        "edm": 0.38,
        "latin": 0.3785,
        "rap": 0.3445,
        "rock": 0.118
      },
      "music_targets": {
        "energy": 0.41,
        "valence": 0.4495,
        "acousticness": 0.3745,
        "instrumentalness": 0.1465,
        "danceability": 0.3225,
        "tempo": 87.34,
        "tempo_norm": 0.364768
      },
      "prototype_matches": [
        {
          "scene": "cafe",
          "similarity": 1.0,
          "description": "咖啡厅 / 安静放松、轻社交、轻度工作",
          "prototype_tags": [
            "indoor",
            "urban",
            "cozy",
            "semi-social",
            "soft-light"
          ]
        },
        {
          "scene": "study_room",
          "similarity": 0.844468,
          "description": "书房/学习空间 / 低能量、高专注、安静稳定",
          "prototype_tags": [
            "indoor",
            "quiet",
            "solo",
            "focus",
            "structured"
          ]
        }
      ],
      "recommendations": [
        {
          "rank": 1,
          "title": "Shallow",
          "artist": "Lady Gaga",
          "genre": "r&b",
          "subgenre": "urban contemporary",
          "final_score": 0.8243,
          "feature_sim": 0.9402,
          "genre_match": 0.5635,
          "popularity": 88,
          "danceability": 0.572,
          "energy": 0.385,
          "acousticness": 0.371,
          "instrumentalness": 0.0,
          "valence": 0.323,
          "tempo": 95.799
        },
        {
          "rank": 2,
          "title": "Nights",
          "artist": "Frank Ocean",
          "genre": "r&b",
          "subgenre": "urban contemporary",
          "final_score": 0.8212,
          "feature_sim": 0.9738,
          "genre_match": 0.5635,
          "popularity": 78,
          "danceability": 0.466,
          "energy": 0.548,
          "acousticness": 0.42,
          "instrumentalness": 1e-06,
          "valence": 0.423,
          "tempo": 89.815
        },
        {
          "rank": 3,
          "title": "Say You Won't Let Go",
          "artist": "James Arthur",
          "genre": "pop",
          "subgenre": "post-teen pop",
          "final_score": 0.7812,
          "feature_sim": 0.9559,
          "genre_match": 0.3995,
          "popularity": 85,
          "danceability": 0.358,
          "energy": 0.557,
          "acousticness": 0.695,
          "instrumentalness": 0.0,
          "valence": 0.494,
          "tempo": 85.043
        },
        {
          "rank": 4,
          "title": "Mandona - Acústico",
          "artist": "Oriente",
          "genre": "edm",
          "subgenre": "pop edm",
          "final_score": 0.7409,
          "feature_sim": 0.9519,
          "genre_match": 0.38,
          "popularity": 69,
          "danceability": 0.652,
          "energy": 0.4,
          "acousticness": 0.339,
          "instrumentalness": 0.0,
          "valence": 0.556,
          "tempo": 88.755
        },
        {
          "rank": 5,
          "title": "Ain't No Sunshine",
          "artist": "Bill Withers",
          "genre": "r&b",
          "subgenre": "urban contemporary",
          "final_score": 0.8193,
          "feature_sim": 0.9779,
          "genre_match": 0.5635,
          "popularity": 76,
          "danceability": 0.479,
          "energy": 0.416,
          "acousticness": 0.457,
          "instrumentalness": 1.7e-05,
          "valence": 0.514,
          "tempo": 79.593
        },
        {
          "rank": 6,
          "title": "Freaking Me Out",
          "artist": "Ava Max",
          "genre": "pop",
          "subgenre": "post-teen pop",
          "final_score": 0.7694,
          "feature_sim": 0.9688,
          "genre_match": 0.3995,
          "popularity": 76,
          "danceability": 0.429,
          "energy": 0.553,
          "acousticness": 0.458,
          "instrumentalness": 0.0,
          "valence": 0.382,
          "tempo": 97.954
        },
        {
          "rank": 7,
          "title": "Stay",
          "artist": "Post Malone",
          "genre": "pop",
          "subgenre": "indie poptimism",
          "final_score": 0.7677,
          "feature_sim": 0.9575,
          "genre_match": 0.3995,
          "popularity": 78,
          "danceability": 0.507,
          "energy": 0.48,
          "acousticness": 0.449,
          "instrumentalness": 0.0,
          "valence": 0.35,
          "tempo": 86.046
        },
        {
          "rank": 8,
          "title": "Coming Home",
          "artist": "Leon Bridges",
          "genre": "r&b",
          "subgenre": "neo soul",
          "final_score": 0.8023,
          "feature_sim": 0.9808,
          "genre_match": 0.5635,
          "popularity": 67,
          "danceability": 0.427,
          "energy": 0.465,
          "acousticness": 0.461,
          "instrumentalness": 5.5e-05,
          "valence": 0.458,
          "tempo": 112.137
        },
        {
          "rank": 9,
          "title": "All Time Low",
          "artist": "Jon Bellion",
          "genre": "edm",
          "subgenre": "pop edm",
          "final_score": 0.715,
          "feature_sim": 0.9533,
          "genre_match": 0.38,
          "popularity": 56,
          "danceability": 0.672,
          "energy": 0.386,
          "acousticness": 0.389,
          "instrumentalness": 0.0,
          "valence": 0.529,
          "tempo": 90.082
        },
        {
          "rank": 10,
          "title": "Lo Que Siento",
          "artist": "Cuco",
          "genre": "pop",
          "subgenre": "dance pop",
          "final_score": 0.7645,
          "feature_sim": 0.9593,
          "genre_match": 0.3995,
          "popularity": 76,
          "danceability": 0.326,
          "energy": 0.685,
          "acousticness": 0.503,
          "instrumentalness": 0.0,
          "valence": 0.409,
          "tempo": 86.882
        }
      ]
    },
    {
      "id": "study_room",
      "label": "书房",
      "icon": "📚",
      "description": "书房/学习空间 / 低能量、高专注、安静稳定",
      "prototype_tags": [
        "indoor",
        "quiet",
        "solo",
        "focus",
        "structured"
      ],
      "recommendation_reason": "该场景focus高(0.95)、relaxation高(0.80)、warmth中等(0.55)，推荐降低 energy，提升 instrumentalness、降低节奏感，提升 acousticness、提升 valence，偏柔和舒适风格的歌曲，最接近原型场景「study_room」",
      "attribute_scores": {
        "arousal": 0.12,
        "socialness": 0.08,
        "focus": 0.95,
        "relaxation": 0.8,
        "nature": 0.05,
        "urban": 0.4,
        "night": 0.15,
        "openness": 0.2,
        "warmth": 0.55
      },
      "attribute_summary": [
        {
          "attribute": "focus",
          "score": 0.95,
          "description": "专注导向。越高表示越适合阅读、学习、深度工作。",
          "music_effect_hint": "降低 energy，提升 instrumentalness"
        },
        {
          "attribute": "relaxation",
          "score": 0.8,
          "description": "放松感/舒缓感。越高表示越柔和、越适合休息与慢节奏陪伴。",
          "music_effect_hint": "降低节奏感，提升 acousticness"
        },
        {
          "attribute": "warmth",
          "score": 0.55,
          "description": "温暖亲和感。越高表示越舒适、柔和、有人情味。",
          "music_effect_hint": "提升 valence，偏柔和舒适风格"
        }
      ],
      "feature_importance": {
        "danceability": 0.172686,
        "energy": 0.1559,
        "acousticness": 0.171923,
        "instrumentalness": 0.216684,
        "valence": 0.143693,
        "tempo_norm": 0.139115
      },
      "genre_priors": {
        "r&b": 0.3955,
        "latin": 0.0605,
        "edm": 0.0275,
        "rock": 0.016,
        "rap": 0.011,
        "pop": 0.0075
      },
      "music_targets": {
        "energy": 0.1435,
        "valence": 0.3625,
        "acousticness": 0.603,
        "instrumentalness": 0.466,
        "danceability": 0.0,
        "tempo": 63.4,
        "tempo_norm": 0.264784
      },
      "prototype_matches": [
        {
          "scene": "study_room",
          "similarity": 1.0,
          "description": "书房/学习空间 / 低能量、高专注、安静稳定",
          "prototype_tags": [
            "indoor",
            "quiet",
            "solo",
            "focus",
            "structured"
          ]
        },
        {
          "scene": "cafe",
          "similarity": 0.844468,
          "description": "咖啡厅 / 安静放松、轻社交、轻度工作",
          "prototype_tags": [
            "indoor",
            "urban",
            "cozy",
            "semi-social",
            "soft-light"
          ]
        }
      ],
      "recommendations": [
        {
          "rank": 1,
          "title": "goodbye",
          "artist": "Billie Eilish",
          "genre": "r&b",
          "subgenre": "urban contemporary",
          "final_score": 0.7779,
          "feature_sim": 0.9325,
          "genre_match": 0.3955,
          "popularity": 77,
          "danceability": 0.153,
          "energy": 0.138,
          "acousticness": 0.837,
          "instrumentalness": 0.55,
          "valence": 0.0503,
          "tempo": 74.318
        },
        {
          "rank": 2,
          "title": "Nobody Other",
          "artist": "Kadhja Bonet",
          "genre": "r&b",
          "subgenre": "neo soul",
          "final_score": 0.7264,
          "feature_sim": 0.9571,
          "genre_match": 0.3955,
          "popularity": 35,
          "danceability": 0.302,
          "energy": 0.179,
          "acousticness": 0.943,
          "instrumentalness": 0.666,
          "valence": 0.279,
          "tempo": 85.477
        },
        {
          "rank": 3,
          "title": "You Don't Know How Lucky You Are",
          "artist": "Keaton Henson",
          "genre": "r&b",
          "subgenre": "urban contemporary",
          "final_score": 0.7183,
          "feature_sim": 0.899,
          "genre_match": 0.3955,
          "popularity": 52,
          "danceability": 0.389,
          "energy": 0.314,
          "acousticness": 0.772,
          "instrumentalness": 0.576,
          "valence": 0.107,
          "tempo": 95.641
        },
        {
          "rank": 4,
          "title": "Norman fucking Rockwell",
          "artist": "Lana Del Rey",
          "genre": "r&b",
          "subgenre": "hip pop",
          "final_score": 0.6944,
          "feature_sim": 0.799,
          "genre_match": 0.3955,
          "popularity": 75,
          "danceability": 0.218,
          "energy": 0.215,
          "acousticness": 0.967,
          "instrumentalness": 0.0847,
          "valence": 0.138,
          "tempo": 76.74
        },
        {
          "rank": 5,
          "title": "Wild Horses",
          "artist": "Old & In The Way",
          "genre": "r&b",
          "subgenre": "hip pop",
          "final_score": 0.6756,
          "feature_sim": 0.8412,
          "genre_match": 0.3955,
          "popularity": 47,
          "danceability": 0.45,
          "energy": 0.313,
          "acousticness": 0.646,
          "instrumentalness": 0.24,
          "valence": 0.547,
          "tempo": 100.299
        },
        {
          "rank": 6,
          "title": "Consequences",
          "artist": "Camila Cabello",
          "genre": "r&b",
          "subgenre": "urban contemporary",
          "final_score": 0.659,
          "feature_sim": 0.7454,
          "genre_match": 0.3955,
          "popularity": 73,
          "danceability": 0.455,
          "energy": 0.292,
          "acousticness": 0.889,
          "instrumentalness": 0.0,
          "valence": 0.43,
          "tempo": 84.339
        },
        {
          "rank": 7,
          "title": "Juicy",
          "artist": "The RH Factor",
          "genre": "r&b",
          "subgenre": "neo soul",
          "final_score": 0.6543,
          "feature_sim": 0.8478,
          "genre_match": 0.3955,
          "popularity": 31,
          "danceability": 0.606,
          "energy": 0.343,
          "acousticness": 0.596,
          "instrumentalness": 0.524,
          "valence": 0.512,
          "tempo": 74.637
        },
        {
          "rank": 8,
          "title": "Best Part (feat. Daniel Caesar)",
          "artist": "H.E.R.",
          "genre": "r&b",
          "subgenre": "urban contemporary",
          "final_score": 0.6538,
          "feature_sim": 0.7236,
          "genre_match": 0.3955,
          "popularity": 78,
          "danceability": 0.473,
          "energy": 0.371,
          "acousticness": 0.795,
          "instrumentalness": 0.0,
          "valence": 0.413,
          "tempo": 75.208
        },
        {
          "rank": 9,
          "title": "Better Than Today",
          "artist": "Rhys Lewis",
          "genre": "r&b",
          "subgenre": "urban contemporary",
          "final_score": 0.6531,
          "feature_sim": 0.7488,
          "genre_match": 0.3955,
          "popularity": 68,
          "danceability": 0.387,
          "energy": 0.234,
          "acousticness": 0.736,
          "instrumentalness": 0.0,
          "valence": 0.408,
          "tempo": 78.65
        },
        {
          "rank": 10,
          "title": "Moon River",
          "artist": "Frank Ocean",
          "genre": "r&b",
          "subgenre": "urban contemporary",
          "final_score": 0.6472,
          "feature_sim": 0.7337,
          "genre_match": 0.3955,
          "popularity": 70,
          "danceability": 0.24,
          "energy": 0.116,
          "acousticness": 0.877,
          "instrumentalness": 0.00092,
          "valence": 0.0937,
          "tempo": 77.349
        }
      ]
    },
    {
      "id": "gym",
      "label": "健身房",
      "icon": "💪",
      "description": "健身房 / 高能量、快节奏、激励型运动环境",
      "prototype_tags": [
        "indoor",
        "active",
        "fitness",
        "high-energy",
        "rhythmic"
      ],
      "recommendation_reason": "该场景arousal高(0.95)、socialness高(0.70)、urban中等(0.65)，推荐提升 energy、tempo、danceability、提升流行感、律动感，弱化器乐独奏倾向、提升 pop、r&b、edm、rap 倾向的歌曲，最接近原型场景「gym」",
      "attribute_scores": {
        "arousal": 0.95,
        "socialness": 0.7,
        "focus": 0.25,
        "relaxation": 0.1,
        "nature": 0.0,
        "urban": 0.65,
        "night": 0.1,
        "openness": 0.45,
        "warmth": 0.45
      },
      "attribute_summary": [
        {
          "attribute": "arousal",
          "score": 0.95,
          "description": "场景唤醒度/动感强度。越高表示越活跃、越具运动感。",
          "music_effect_hint": "提升 energy、tempo、danceability"
        },
        {
          "attribute": "socialness",
          "score": 0.7,
          "description": "社交密度/互动感。越高表示越适合交流、聚会或共同活动。",
          "music_effect_hint": "提升流行感、律动感，弱化器乐独奏倾向"
        },
        {
          "attribute": "urban",
          "score": 0.65,
          "description": "都市感/人造环境感。越高表示越偏城市、商业、建筑和夜生活氛围。",
          "music_effect_hint": "提升 pop、r&b、edm、rap 倾向"
        }
      ],
      "feature_importance": {
        "danceability": 0.155914,
        "energy": 0.149194,
        "acousticness": 0.185484,
        "instrumentalness": 0.188172,
        "valence": 0.166667,
        "tempo_norm": 0.15457
      },
      "genre_priors": {
        "edm": 0.705,
        "rap": 0.5375,
        "pop": 0.4875,
        "latin": 0.48,
        "rock": 0.3875,
        "r&b": 0.35
      },
      "music_targets": {
        "energy": 0.7275,
        "valence": 0.275,
        "acousticness": 0.055,
        "instrumentalness": 0.0,
        "danceability": 0.615,
        "tempo": 129.7,
        "tempo_norm": 0.541681
      },
      "prototype_matches": [
        {
          "scene": "gym",
          "similarity": 1.0,
          "description": "健身房 / 高能量、快节奏、激励型运动环境",
          "prototype_tags": [
            "indoor",
            "active",
            "fitness",
            "high-energy",
            "rhythmic"
          ]
        },
        {
          "scene": "cafe",
          "similarity": 0.798184,
          "description": "咖啡厅 / 安静放松、轻社交、轻度工作",
          "prototype_tags": [
            "indoor",
            "urban",
            "cozy",
            "semi-social",
            "soft-light"
          ]
        }
      ],
      "recommendations": [
        {
          "rank": 1,
          "title": "Where Have You Gone (Anywhere)",
          "artist": "Lucas & Steve",
          "genre": "edm",
          "subgenre": "progressive electro house",
          "final_score": 0.8575,
          "feature_sim": 0.9975,
          "genre_match": 0.705,
          "popularity": 72,
          "danceability": 0.618,
          "energy": 0.767,
          "acousticness": 0.00552,
          "instrumentalness": 0.0,
          "valence": 0.239,
          "tempo": 124.071
        },
        {
          "rank": 2,
          "title": "Speechless (feat. Erika Sirola)",
          "artist": "Robin Schulz",
          "genre": "pop",
          "subgenre": "post-teen pop",
          "final_score": 0.8127,
          "feature_sim": 0.9989,
          "genre_match": 0.4875,
          "popularity": 78,
          "danceability": 0.574,
          "energy": 0.728,
          "acousticness": 0.0161,
          "instrumentalness": 1e-06,
          "valence": 0.266,
          "tempo": 125.047
        },
        {
          "rank": 3,
          "title": "No Sleep (feat. Bonn) - DubVision Remix",
          "artist": "Martin Garrix",
          "genre": "edm",
          "subgenre": "electro house",
          "final_score": 0.8512,
          "feature_sim": 0.9982,
          "genre_match": 0.705,
          "popularity": 69,
          "danceability": 0.584,
          "energy": 0.79,
          "acousticness": 0.0455,
          "instrumentalness": 0.0,
          "valence": 0.291,
          "tempo": 127.972
        },
        {
          "rank": 4,
          "title": "Litty (feat. Tory Lanez)",
          "artist": "Meek Mill",
          "genre": "rap",
          "subgenre": "gangster rap",
          "final_score": 0.798,
          "feature_sim": 0.9998,
          "genre_match": 0.5375,
          "popularity": 65,
          "danceability": 0.592,
          "energy": 0.701,
          "acousticness": 0.0451,
          "instrumentalness": 0.0,
          "valence": 0.282,
          "tempo": 129.501
        },
        {
          "rank": 5,
          "title": "The Spectre",
          "artist": "Alan Walker",
          "genre": "pop",
          "subgenre": "electropop",
          "final_score": 0.8047,
          "feature_sim": 0.9962,
          "genre_match": 0.4875,
          "popularity": 75,
          "danceability": 0.654,
          "energy": 0.711,
          "acousticness": 0.0214,
          "instrumentalness": 0.00191,
          "valence": 0.198,
          "tempo": 127.957
        },
        {
          "rank": 6,
          "title": "Alone (feat. Anjulie & Jeffrey Jey)",
          "artist": "Marnik",
          "genre": "edm",
          "subgenre": "big room",
          "final_score": 0.8435,
          "feature_sim": 0.996,
          "genre_match": 0.705,
          "popularity": 66,
          "danceability": 0.553,
          "energy": 0.776,
          "acousticness": 0.0536,
          "instrumentalness": 1e-06,
          "valence": 0.339,
          "tempo": 128.123
        },
        {
          "rank": 7,
          "title": "T.R.U. (Totally Rotten Underground)",
          "artist": "$uicideBoy$",
          "genre": "rap",
          "subgenre": "gangster rap",
          "final_score": 0.7751,
          "feature_sim": 0.998,
          "genre_match": 0.5375,
          "popularity": 55,
          "danceability": 0.694,
          "energy": 0.711,
          "acousticness": 0.0397,
          "instrumentalness": 0.0,
          "valence": 0.283,
          "tempo": 138.049
        },
        {
          "rank": 8,
          "title": "Green Light",
          "artist": "Lorde",
          "genre": "pop",
          "subgenre": "post-teen pop",
          "final_score": 0.8018,
          "feature_sim": 0.9993,
          "genre_match": 0.4875,
          "popularity": 73,
          "danceability": 0.594,
          "energy": 0.721,
          "acousticness": 0.0209,
          "instrumentalness": 9e-06,
          "valence": 0.253,
          "tempo": 128.942
        },
        {
          "rank": 9,
          "title": "Keep On Lovin'",
          "artist": "Cat Dealers",
          "genre": "edm",
          "subgenre": "electro house",
          "final_score": 0.8382,
          "feature_sim": 0.9986,
          "genre_match": 0.705,
          "popularity": 63,
          "danceability": 0.601,
          "energy": 0.726,
          "acousticness": 0.0053,
          "instrumentalness": 0.0,
          "valence": 0.256,
          "tempo": 124.078
        },
        {
          "rank": 10,
          "title": "Ghost Ranch",
          "artist": "Upchurch",
          "genre": "rap",
          "subgenre": "southern hip hop",
          "final_score": 0.7679,
          "feature_sim": 0.9967,
          "genre_match": 0.5375,
          "popularity": 52,
          "danceability": 0.598,
          "energy": 0.742,
          "acousticness": 0.00935,
          "instrumentalness": 2e-06,
          "valence": 0.349,
          "tempo": 129.984
        }
      ]
    },
    {
      "id": "night_street",
      "label": "夜晚街道",
      "icon": "🌃",
      "description": "夜晚街道 / 都市夜色、中等能量、冷感沉浸",
      "prototype_tags": [
        "outdoor",
        "urban",
        "night",
        "neon",
        "moody"
      ],
      "recommendation_reason": "该场景night高(0.96)、urban高(0.95)、openness中等(0.62)，推荐提升 r&b、chill、synthwave 倾向，valence 可略降、提升 pop、r&b、edm、rap 倾向、适配更铺展、开阔的听感和编排的歌曲，最接近原型场景「night_street」",
      "attribute_scores": {
        "arousal": 0.58,
        "socialness": 0.42,
        "focus": 0.18,
        "relaxation": 0.22,
        "nature": 0.0,
        "urban": 0.95,
        "night": 0.96,
        "openness": 0.62,
        "warmth": 0.28
      },
      "attribute_summary": [
        {
          "attribute": "night",
          "score": 0.96,
          "description": "夜晚感/暗色氛围。越高表示越偏夜间、暗光和人工灯源环境。",
          "music_effect_hint": "提升 r&b、chill、synthwave 倾向，valence 可略降"
        },
        {
          "attribute": "urban",
          "score": 0.95,
          "description": "都市感/人造环境感。越高表示越偏城市、商业、建筑和夜生活氛围。",
          "music_effect_hint": "提升 pop、r&b、edm、rap 倾向"
        },
        {
          "attribute": "openness",
          "score": 0.62,
          "description": "空间开阔度。越高表示视野更开阔、空间更外向。",
          "music_effect_hint": "适配更铺展、开阔的听感和编排"
        }
      ],
      "feature_importance": {
        "danceability": 0.13035,
        "energy": 0.092218,
        "acousticness": 0.255642,
        "instrumentalness": 0.210895,
        "valence": 0.206226,
        "tempo_norm": 0.104669
      },
      "genre_priors": {
        "r&b": 0.6535,
        "rap": 0.6505,
        "edm": 0.57,
        "pop": 0.401,
        "latin": 0.378,
        "rock": 0.307
      },
      "music_targets": {
        "energy": 0.5445,
        "valence": 0.126,
        "acousticness": 0.0715,
        "instrumentalness": 0.0,
        "danceability": 0.4525,
        "tempo": 110.38,
        "tempo_norm": 0.460992
      },
      "prototype_matches": [
        {
          "scene": "night_street",
          "similarity": 1.0,
          "description": "夜晚街道 / 都市夜色、中等能量、冷感沉浸",
          "prototype_tags": [
            "outdoor",
            "urban",
            "night",
            "neon",
            "moody"
          ]
        },
        {
          "scene": "gym",
          "similarity": 0.788441,
          "description": "健身房 / 高能量、快节奏、激励型运动环境",
          "prototype_tags": [
            "indoor",
            "active",
            "fitness",
            "high-energy",
            "rhythmic"
          ]
        }
      ],
      "recommendations": [
        {
          "rank": 1,
          "title": "Save That Shit",
          "artist": "Lil Peep",
          "genre": "rap",
          "subgenre": "trap",
          "final_score": 0.8547,
          "feature_sim": 0.9932,
          "genre_match": 0.6505,
          "popularity": 80,
          "danceability": 0.534,
          "energy": 0.583,
          "acousticness": 0.0262,
          "instrumentalness": 0.0,
          "valence": 0.145,
          "tempo": 105.997
        },
        {
          "rank": 2,
          "title": "Naked",
          "artist": "James Arthur",
          "genre": "r&b",
          "subgenre": "hip pop",
          "final_score": 0.8439,
          "feature_sim": 0.9854,
          "genre_match": 0.6535,
          "popularity": 76,
          "danceability": 0.529,
          "energy": 0.607,
          "acousticness": 0.104,
          "instrumentalness": 0.0,
          "valence": 0.238,
          "tempo": 101.966
        },
        {
          "rank": 3,
          "title": "What About Us",
          "artist": "P!nk",
          "genre": "edm",
          "subgenre": "pop edm",
          "final_score": 0.8234,
          "feature_sim": 0.9936,
          "genre_match": 0.57,
          "popularity": 76,
          "danceability": 0.489,
          "energy": 0.588,
          "acousticness": 0.0285,
          "instrumentalness": 2e-06,
          "valence": 0.187,
          "tempo": 113.617
        },
        {
          "rank": 4,
          "title": "Reply (feat. Lil Uzi Vert)",
          "artist": "A Boogie Wit da Hoodie",
          "genre": "rap",
          "subgenre": "hip hop",
          "final_score": 0.85,
          "feature_sim": 0.9879,
          "genre_match": 0.6505,
          "popularity": 79,
          "danceability": 0.512,
          "energy": 0.623,
          "acousticness": 0.0187,
          "instrumentalness": 0.0,
          "valence": 0.219,
          "tempo": 112.15
        },
        {
          "rank": 5,
          "title": "Summer Reign (feat. Summer Walker)",
          "artist": "Rick Ross",
          "genre": "r&b",
          "subgenre": "urban contemporary",
          "final_score": 0.821,
          "feature_sim": 0.9932,
          "genre_match": 0.6535,
          "popularity": 62,
          "danceability": 0.517,
          "energy": 0.541,
          "acousticness": 0.0394,
          "instrumentalness": 0.0,
          "valence": 0.123,
          "tempo": 139.076
        },
        {
          "rank": 6,
          "title": "Shameless",
          "artist": "Camila Cabello",
          "genre": "edm",
          "subgenre": "pop edm",
          "final_score": 0.8168,
          "feature_sim": 0.9809,
          "genre_match": 0.57,
          "popularity": 76,
          "danceability": 0.377,
          "energy": 0.651,
          "acousticness": 0.0197,
          "instrumentalness": 5.3e-05,
          "valence": 0.0851,
          "tempo": 129.698
        },
        {
          "rank": 7,
          "title": "Runnin' Thru The 7th With My Woadies",
          "artist": "$uicideBoy$",
          "genre": "rap",
          "subgenre": "gangster rap",
          "final_score": 0.8408,
          "feature_sim": 0.9962,
          "genre_match": 0.6505,
          "popularity": 72,
          "danceability": 0.526,
          "energy": 0.62,
          "acousticness": 0.067,
          "instrumentalness": 0.000241,
          "valence": 0.187,
          "tempo": 112.027
        },
        {
          "rank": 8,
          "title": "Freak in You",
          "artist": "PARTYNEXTDOOR",
          "genre": "r&b",
          "subgenre": "neo soul",
          "final_score": 0.8188,
          "feature_sim": 0.9813,
          "genre_match": 0.6535,
          "popularity": 64,
          "danceability": 0.424,
          "energy": 0.419,
          "acousticness": 0.144,
          "instrumentalness": 0.0,
          "valence": 0.119,
          "tempo": 86.5
        },
        {
          "rank": 9,
          "title": "Life Of The Party",
          "artist": "Shawn Mendes",
          "genre": "edm",
          "subgenre": "pop edm",
          "final_score": 0.8111,
          "feature_sim": 0.9883,
          "genre_match": 0.57,
          "popularity": 71,
          "danceability": 0.667,
          "energy": 0.614,
          "acousticness": 0.0663,
          "instrumentalness": 0.0,
          "valence": 0.161,
          "tempo": 113.979
        },
        {
          "rank": 10,
          "title": "Get Low",
          "artist": "Ying Yang Twins",
          "genre": "rap",
          "subgenre": "southern hip hop",
          "final_score": 0.837,
          "feature_sim": 0.9924,
          "genre_match": 0.6505,
          "popularity": 71,
          "danceability": 0.521,
          "energy": 0.625,
          "acousticness": 0.0301,
          "instrumentalness": 0.0,
          "valence": 0.136,
          "tempo": 101.019
        }
      ]
    },
    {
      "id": "mountain",
      "label": "山野户外",
      "icon": "🏔️",
      "description": "山地/户外自然场景 / 开阔、自然、略带力量感",
      "prototype_tags": [
        "outdoor",
        "nature",
        "open",
        "landscape",
        "fresh-air"
      ],
      "recommendation_reason": "该场景nature高(0.98)、openness高(0.95)、relaxation中等(0.68)，推荐提升 acoustic、folk、ambient 倾向、适配更铺展、开阔的听感和编排、降低节奏感，提升 acousticness的歌曲，最接近原型场景「mountain」",
      "attribute_scores": {
        "arousal": 0.45,
        "socialness": 0.05,
        "focus": 0.35,
        "relaxation": 0.68,
        "nature": 0.98,
        "urban": 0.0,
        "night": 0.08,
        "openness": 0.95,
        "warmth": 0.6
      },
      "attribute_summary": [
        {
          "attribute": "nature",
          "score": 0.98,
          "description": "自然感。越高表示越偏自然景观、植被、天空、山水等元素。",
          "music_effect_hint": "提升 acoustic、folk、ambient 倾向"
        },
        {
          "attribute": "openness",
          "score": 0.95,
          "description": "空间开阔度。越高表示视野更开阔、空间更外向。",
          "music_effect_hint": "适配更铺展、开阔的听感和编排"
        },
        {
          "attribute": "relaxation",
          "score": 0.68,
          "description": "放松感/舒缓感。越高表示越柔和、越适合休息与慢节奏陪伴。",
          "music_effect_hint": "降低节奏感，提升 acousticness"
        }
      ],
      "feature_importance": {
        "danceability": 0.19103,
        "energy": 0.114203,
        "acousticness": 0.209718,
        "instrumentalness": 0.214286,
        "valence": 0.197674,
        "tempo_norm": 0.07309
      },
      "genre_priors": {
        "rock": 0.5005,
        "edm": 0.255,
        "r&b": 0.255,
        "latin": 0.1445,
        "rap": 0.022,
        "pop": 0.0
      },
      "music_targets": {
        "energy": 0.3575,
        "valence": 0.513,
        "acousticness": 0.5775,
        "instrumentalness": 0.328,
        "danceability": 0.14,
        "tempo": 87.36,
        "tempo_norm": 0.364851
      },
      "prototype_matches": [
        {
          "scene": "mountain",
          "similarity": 1.0,
          "description": "山地/户外自然场景 / 开阔、自然、略带力量感",
          "prototype_tags": [
            "outdoor",
            "nature",
            "open",
            "landscape",
            "fresh-air"
          ]
        },
        {
          "scene": "cafe",
          "similarity": 0.606797,
          "description": "咖啡厅 / 安静放松、轻社交、轻度工作",
          "prototype_tags": [
            "indoor",
            "urban",
            "cozy",
            "semi-social",
            "soft-light"
          ]
        }
      ],
      "recommendations": [
        {
          "rank": 1,
          "title": "Please, Please, Please, Let Me Get What I Want - 2011 Remaster",
          "artist": "The Smiths",
          "genre": "rock",
          "subgenre": "permanent wave",
          "final_score": 0.7889,
          "feature_sim": 0.9169,
          "genre_match": 0.5005,
          "popularity": 65,
          "danceability": 0.241,
          "energy": 0.468,
          "acousticness": 0.534,
          "instrumentalness": 0.0,
          "valence": 0.451,
          "tempo": 91.581
        },
        {
          "rank": 2,
          "title": "You Can't Always Get What You Want",
          "artist": "The Rolling Stones",
          "genre": "rock",
          "subgenre": "classic rock",
          "final_score": 0.7804,
          "feature_sim": 0.9011,
          "genre_match": 0.5005,
          "popularity": 66,
          "danceability": 0.32,
          "energy": 0.62,
          "acousticness": 0.64,
          "instrumentalness": 6.4e-05,
          "valence": 0.472,
          "tempo": 86.327
        },
        {
          "rank": 3,
          "title": "C U Girl",
          "artist": "Steve Lacy",
          "genre": "r&b",
          "subgenre": "neo soul",
          "final_score": 0.7362,
          "feature_sim": 0.9045,
          "genre_match": 0.255,
          "popularity": 69,
          "danceability": 0.414,
          "energy": 0.473,
          "acousticness": 0.663,
          "instrumentalness": 0.0523,
          "valence": 0.409,
          "tempo": 100.0
        },
        {
          "rank": 4,
          "title": "Horizon",
          "artist": "Tektrik",
          "genre": "edm",
          "subgenre": "progressive electro house",
          "final_score": 0.7175,
          "feature_sim": 0.9676,
          "genre_match": 0.255,
          "popularity": 31,
          "danceability": 0.419,
          "energy": 0.595,
          "acousticness": 0.837,
          "instrumentalness": 0.379,
          "valence": 0.524,
          "tempo": 81.83
        },
        {
          "rank": 5,
          "title": "Nights In White Satin - Single Version / Mono Mix",
          "artist": "The Moody Blues",
          "genre": "rock",
          "subgenre": "album rock",
          "final_score": 0.7792,
          "feature_sim": 0.8967,
          "genre_match": 0.5005,
          "popularity": 67,
          "danceability": 0.195,
          "energy": 0.483,
          "acousticness": 0.465,
          "instrumentalness": 0.497,
          "valence": 0.173,
          "tempo": 84.71
        },
        {
          "rank": 6,
          "title": "Wild Horses",
          "artist": "Old & In The Way",
          "genre": "r&b",
          "subgenre": "hip pop",
          "final_score": 0.7325,
          "feature_sim": 0.9524,
          "genre_match": 0.255,
          "popularity": 47,
          "danceability": 0.45,
          "energy": 0.313,
          "acousticness": 0.646,
          "instrumentalness": 0.24,
          "valence": 0.547,
          "tempo": 100.299
        },
        {
          "rank": 7,
          "title": "Stripes",
          "artist": "Ben Esser",
          "genre": "edm",
          "subgenre": "electro house",
          "final_score": 0.7041,
          "feature_sim": 0.9223,
          "genre_match": 0.255,
          "popularity": 41,
          "danceability": 0.533,
          "energy": 0.279,
          "acousticness": 0.86,
          "instrumentalness": 0.186,
          "valence": 0.555,
          "tempo": 86.959
        },
        {
          "rank": 8,
          "title": "Uncle Albert / Admiral Halsey - Medley / Remastered 2012",
          "artist": "Paul McCartney",
          "genre": "rock",
          "subgenre": "permanent wave",
          "final_score": 0.7696,
          "feature_sim": 0.9109,
          "genre_match": 0.5005,
          "popularity": 55,
          "danceability": 0.371,
          "energy": 0.507,
          "acousticness": 0.58,
          "instrumentalness": 0.0201,
          "valence": 0.535,
          "tempo": 91.786
        },
        {
          "rank": 9,
          "title": "Could've Been (feat. Bryson Tiller)",
          "artist": "H.E.R.",
          "genre": "r&b",
          "subgenre": "urban contemporary",
          "final_score": 0.7265,
          "feature_sim": 0.8747,
          "genre_match": 0.255,
          "popularity": 75,
          "danceability": 0.455,
          "energy": 0.352,
          "acousticness": 0.654,
          "instrumentalness": 4e-06,
          "valence": 0.407,
          "tempo": 103.342
        },
        {
          "rank": 10,
          "title": "Give Me Love (Give Me Peace On Earth)",
          "artist": "George Harrison",
          "genre": "rock",
          "subgenre": "permanent wave",
          "final_score": 0.7663,
          "feature_sim": 0.8936,
          "genre_match": 0.5005,
          "popularity": 60,
          "danceability": 0.373,
          "energy": 0.57,
          "acousticness": 0.497,
          "instrumentalness": 0.0124,
          "valence": 0.631,
          "tempo": 81.28
        }
      ]
    }
  ],
  "samples": [
    {
      "id": "cafe",
      "label": "☕ 咖啡厅",
      "scene_id": "cafe",
      "image": "assets/images/cafe.jpg",
      "description": "示例图片，对应场景：咖啡厅"
    },
    {
      "id": "study_room",
      "label": "📚 书房",
      "scene_id": "study_room",
      "image": "assets/images/study_room.jpg",
      "description": "示例图片，对应场景：书房"
    },
    {
      "id": "gym",
      "label": "💪 健身房",
      "scene_id": "gym",
      "image": "assets/images/gym.jpg",
      "description": "示例图片，对应场景：健身房"
    },
    {
      "id": "night_street",
      "label": "🌃 夜晚街道",
      "scene_id": "night_street",
      "image": "assets/images/night_street.jpg",
      "description": "示例图片，对应场景：夜晚街道"
    },
    {
      "id": "mountain",
      "label": "🏔️ 山野户外",
      "scene_id": "mountain",
      "image": "assets/images/mountain.jpg",
      "description": "示例图片，对应场景：山野户外"
    }
  ]
};
