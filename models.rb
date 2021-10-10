require 'bundler/setup'
Bundler.require

#if development?
    ActiveRecord::Base.establish_connection#("sqlite3:db/development.db")
    # establish_connectionメソッドで使用するDBを指定する("DB:file")
#end

class Eraser < ActiveRecord::Base
end

class ReserveNum < ActiveRecord::Base
    validates :player_id, uniqueness: true
end
