require 'bundler/setup'
Bundler.require
require 'sinatra/reloader' if development?
require 'sinatra-websocket'
require 'sinatra/activerecord'
require './models'
require 'pry' if development?
require 'json'

set :server, 'thin'
set :sockets, []

get '/' do
  erb :index
end

# プレイ開始&コマ位置取得
post '/start' do
    # 消しゴム作成
    eraser = Eraser.create(
        x: params[:x],
        y: params[:y]
    )

    # 新しい消しゴムが召喚された時
    content_type :json
    to_ws = {
        event: "new",
        id: eraser.id,
        x: params[:x],
        y: params[:y],
    }
    
    settings.sockets.each do |s|
        s[:ws].send(to_ws.to_json)
    end
    
    # RESPONSE
    data = {
        id: eraser[:id],
        erasers: Eraser.all
    }

    data.to_json

    # redirect '/start'
end

# 角度・強さ送信
post '/eraser/snap' do

    # 生存確認
    my_eraser = Eraser.find(params[:id])

    # 誰かが弾いた時にばら撒かれるデータ(全体ブロードキャスト)
    content_type :json
    to_ws = {
        id: params[:id],
        event: "snap",
        x: params[:x],
        y: params[:y],
    }
    
    settings.sockets.each do |s|
        s[:ws].send(to_ws.to_json)
    end
    
    # RESPONSE
    if(my_eraser)
        data = {
            ok: "ture",
            data: to_ws
        }
    else
        data = {
            ok: "false"
        }
    end

    data.to_json
end

# 弾き予約
post '/snap/reserve' do

    reserve = ReserveNum.create(
        player_id: params[:id].to_i
    )

    # 次のターン通知
    if(ReserveNum.all.count == 0)
        reserve_func
    end

    # RESPONSE
    if(reserve)
        data = {
            ok: "ture"
        }
    else
        data = {
            ok: "false"
        }
    end

    data.to_json

end

# コマ削除
post '/erasar/remove' do
    
    # 負けたコマを取得
    eraser = Eraser.find(params[:id])

    if erasar.delete
        data = {
            ok: "ture"
        }
    else
        data = {
            ok: "false"
        }
    end

    data.to_json

end

# コマ位置通知=ターン終了
post '/eraser/position' do

    # 終了したコマの取得
    # reserve = ReserveNum.where(player_id: params[:id])
    eraser = Eraser.find(params[:id])

    # 位置の更新
    eraser.update(
        x: params[:x].to_f,
        y: params[:y].to_f
    )

    eraser.save
    
    # 次のターン通知
    reserve_func

    # RESPONSE
    if(eraser)
        data = {
            ok: "OK"
        }
    else
        data = {
            ok: "NG"
        }
    end

    data.to_json

end

get '/websocket/:id' do
  if request.websocket?
    request.websocket do |ws|
      ws.onopen do
        # settings.sockets << ws
        settings.sockets << { id: params[:id], ws: ws }
      end
    #   ws.onmessage do |msg|
    #     settings.sockets.each do |s|
    #         s.send(msg)
    #     end
    #   end
      ws.onclose do
        # settings.sockets.delete(ws)
        settings.sockets.delete({ id: params[:id], ws: ws })
      end
    end
  end
end

# 次のターン通知
def reserve_func
    # ーーーーーーーーーーーーーーーー
    # 次のターンのユーザーに通知する

    # 弾き予約のはじめのユーザーを取得
    next_turn = ReserveNum.first

    if(next_turn)
        settings.sockets.each { |s|
            # 弾き予約のはじめのユーザーのidと一致すれば、そのユーザーに通知する
            if s[:id] == "#{next_turn.player_id}"
                res = {
                    event: "turn #{next_turn.player_id}"
                }
                s[:ws].send(res.to_json)
            end
        }
        # 通知したユーザーの弾き予約をDBから削除する
        next_turn.delete
    end

    # ーーーーーーーーーーーーーーーーー
end