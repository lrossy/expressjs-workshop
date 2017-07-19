var bcrypt = require('bcrypt-as-promised');
var HASH_ROUNDS = 10;

class RedditAPI {
  constructor(conn) {
    this.conn = conn;
  }

  createPost(post) {
      if(!post.subredditId){
        return Promise.reject('subredditId property required')
      }
      return this.conn.query(
          `
          INSERT INTO posts (userId, title, url, subredditId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [post.userId, post.title, post.url, post.subredditId]
      )
          .then(result => {
            return result.insertId;
          });
  }

  createSubreddit(subreddit) {
    return this.conn.query(
      `
          INSERT INTO subreddit (name, description, createdAt, updatedAt)
          VALUES (?, ?, NOW(), NOW())`,
      [subreddit.name, subreddit.description]
      )
      .then(result => {
        return result.insertId;
      })
      .catch(error => {
        // Special error handling for duplicate entry
        if (error.code === 'ER_DUP_ENTRY') {
          throw new Error('A subreddit with this name already exists');
        }
        else {
          throw error;
        }
      });
  }

  getAllSubreddits(){
    return this.conn.query(
      `
          SELECT *
          FROM subreddit s
          ORDER BY createdAt DESC
          LIMIT 25`
    )
  }

  getAllPosts() {
      /*
      strings delimited with ` are an ES2015 feature called "template strings".
      they are more powerful than what we are using them for here. one feature of
      template strings is that you can write them on multiple lines. if you try to
      skip a line in a single- or double-quoted string, you would get a syntax error.

      therefore template strings make it very easy to write SQL queries that span multiple
      lines without having to manually split the string line by line.
       */
      return this.conn.query(
          `
          SELECT p.id AS postId, title, url, p.userId AS userId, p.createdAt, p.updatedAt,
           u.id AS user_id, u.username AS username, u.createdAt AS createdAtUser, u.updatedAt AS updatedAtUser,
           s.id AS sub_id, s.name AS sub_name, s.description AS sub_description
           , SUM(voteDirection) AS voteScore
          FROM posts p
          JOIN users u ON u.id = p.userId
          JOIN subreddit s ON s.id = p.subredditId
          LEFT JOIN votes v ON v.postId = p.id
          GROUP BY p.id
          ORDER BY voteScore DESC
          LIMIT 25`
      ).then(result => {

        return result.map(function (post) {
          return {
            id: post.postId,
            title: post.title,
            url: post.url,
            user: {
              id: post.userId,
              username: post.username,
              createdAt: post.createdAtUser,
              updatedAt: post.updatedAtUser
            },
            subreddit: {
              id: post.sub_id,
              name: post.sub_name,
              description: post.sub_description
            },
            voteScore: post.voteScore,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt
          }
        });
      });
  }

  createVote(vote){
    if(!vote.voteDirection || (vote.voteDirection !== -1 && vote.voteDirection !== 1 && vote.voteDirection !== 0)){
      return Promise.reject('voteDirection must be -1, 0 or 1')
    }
    return this.conn.query(
      `
          INSERT INTO votes SET userId=?, postId=?, voteDirection=?
          ON DUPLICATE KEY UPDATE voteDirection=?`,
      [vote.userId, vote.postId, vote.voteDirection, vote.voteDirection]
      )
      .then(result => {
        console.log('result', result);
        return result.insertId;
      });
  }

  createComment(comment){
    if(!comment || (!comment.userId && !comment.postId && !comment.text)){
      return Promise.reject('userId postId text properties are required')
    }
    var parentId = comment.parentId ? comment.parentId : null;

    return this.conn.query(
      `
          INSERT INTO comments (userId, postId, text, parentId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [comment.postId, comment.postId, comment.text, parentId]
      )
      .then(result => {
        return result.insertId;
      });
  }

  getCommentsForPost(postId, cb){
    var self = this;
    var getComments = function(postId, parentIds, allComments, commentIdx, cb){
      var q;

      if(parentIds){
        if(parentIds.length === 0){
          return cb(null, allComments);
        }

        q =  `SELECT id, parentId, userId, postId, text, createdAt, updatedAt
        FROM comments c
        WHERE postId = ${postId} AND parentId IN (${parentIds.join()})
        ORDER BY c.createdAt`;
      }
      else{
        q =  `SELECT id, parentId, userId, postId, text, createdAt, updatedAt
        FROM comments c
        WHERE postId = ${postId} AND parentId IS NULL
        ORDER BY c.createdAt`;
      }

      self.conn.query(q)
        .then( res => {
          var parentKeys = [];
          res.forEach( comment => {
            if(commentIdx[comment.parentId]){
              commentIdx[comment.parentId].replies.push(comment);
            }

            parentKeys.push(comment.id);
            comment.replies = [];
            commentIdx[comment.id] = comment;
            if(comment.parentId === null){
              allComments.push(comment);
            }
            // console.log('commentIdx',commentIdx)
          });
          getComments(postId, parentKeys, allComments, commentIdx, cb);
        })
    };

    getComments(postId, null, [], {}, cb);
  }
}

module.exports = RedditAPI;